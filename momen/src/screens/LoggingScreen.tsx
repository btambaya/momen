/**
 * LoggingScreen — Main marker logging interface
 *
 * The primary screen where users spend most of their time.
 * Features: running timecode, mark button, CUT button, marker list, export,
 * end session with glassmorphism modals.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  BackHandler,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fonts, fontSize, spacing, radius } from '../theme';
import { TimecodeDisplay } from '../components/TimecodeDisplay';
import { MarkButton } from '../components/MarkButton';
import { MarkerListItem } from '../components/MarkerListItem';
import { GlassModal } from '../components/GlassModal';
import { RootStackParamList, Session, Marker } from '../types';
import { getSession, getSessionSyncData, endSession } from '../database/sessionRepository';
import { addMarker, getMarkers, updateMarkerNote, deleteMarker } from '../database/markerRepository';
import { msToSmpte } from '../engine/timecode';
import { generateExportFiles, shareFile } from '../export/exportManager';

const SYNC_NOTE = 'Align this marker to the frame of the clap in your footage to synchronise all subsequent markers.';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'Logging'>;
type RoutePropType = RouteProp<RootStackParamList, 'Logging'>;

export function LoggingScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { sessionId } = route.params;

  const [session, setSession] = useState<Session | null>(null);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [syncPerformanceTime, setSyncPerformanceTime] = useState(0);
  const [cameraTcMs, setCameraTcMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [latestMarkerId, setLatestMarkerId] = useState<string | null>(null);
  const [frozenTimecode, setFrozenTimecode] = useState<string | null>(null);

  // Modal state
  const [showCutModal, setShowCutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteMarkerId, setDeleteMarkerId] = useState<string | null>(null);
  const [showNoMarkersModal, setShowNoMarkersModal] = useState(false);

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [exportPaths, setExportPaths] = useState<{
    csvPath: string;
    fcpxmlPath: string;
    edlPath: string;
  } | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const listRef = useRef<FlatList>(null);
  const flashAnim = useRef(new Animated.Value(0)).current;
  const lastMarkTimeRef = useRef(0); // double-tap guard

  useFocusEffect(
    useCallback(() => {
      loadSession();
    }, [sessionId])
  );

  // Block Android hardware back button when session is active
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // If session is active (not ended), eat the back press
        if (session && !session.isEnded) {
          return true; // handled — do nothing
        }
        return false; // let default navigation happen
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [session])
  );

  const loadSession = async () => {
    const s = await getSession(sessionId);
    if (!s) return;
    setSession(s);

    if (s.isEnded) {
      setIsRunning(false);
      if (s.finalTcMs && s.finalTcMs > 0) {
        setFrozenTimecode(msToSmpte(s.finalTcMs, s.frameRate));
      }
    } else {
      const syncData = await getSessionSyncData(sessionId);
      if (syncData) {
        setSyncPerformanceTime(syncData.syncPerformanceTime);
        setCameraTcMs(syncData.cameraTcMs);
        setIsRunning(true);
      }
    }

    const m = await getMarkers(sessionId);
    setMarkers(m);
  };

  const handleMark = useCallback(async () => {
    if (!session) return;

    // Double-tap guard — ignore taps within 150ms
    const now = performance.now();
    if (now - lastMarkTimeRef.current < 150) return;
    lastMarkTimeRef.current = now;

    const tapPerformanceTime = now;

    let timecodeMs: number;
    if (session.syncMethod === 'manual') {
      const elapsed = tapPerformanceTime - syncPerformanceTime;
      timecodeMs = cameraTcMs + elapsed;
    } else {
      const elapsed = tapPerformanceTime - syncPerformanceTime;
      timecodeMs = elapsed;
    }

    const timecodeSmpte = msToSmpte(timecodeMs, session.frameRate);

    const currentMarkers = await getMarkers(sessionId);
    const isSyncPoint = session.syncMethod === 'clap' && currentMarkers.length === 0;

    const marker = await addMarker(
      sessionId,
      timecodeMs,
      timecodeSmpte,
      isSyncPoint ? SYNC_NOTE : '',
      isSyncPoint
    );

    setMarkers((prev) => [...prev, marker]);
    setLatestMarkerId(marker.id);

    Animated.sequence([
      Animated.timing(flashAnim, {
        toValue: 1,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(flashAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [session, syncPerformanceTime, cameraTcMs, sessionId, flashAnim]);

  const handleUpdateNote = async (markerId: string, note: string) => {
    await updateMarkerNote(markerId, note);
    setMarkers((prev) =>
      prev.map((m) => (m.id === markerId ? { ...m, note } : m))
    );
  };

  const handleRequestDelete = (markerId: string) => {
    setDeleteMarkerId(markerId);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteMarkerId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowDeleteModal(false);
    await deleteMarker(deleteMarkerId);
    const updated = await getMarkers(sessionId);
    setMarkers(updated);
    setDeleteMarkerId(null);
  };

  const handleExport = async () => {
    if (!session) return;
    if (markers.length === 0) {
      setShowNoMarkersModal(true);
      return;
    }
    try {
      setIsExporting(true);
      const result = await generateExportFiles(session, markers);
      setExportPaths(result);
      setShowShareModal(true);
    } catch (e: any) {
      console.error('Export error', e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleConfirmCut = async () => {
    setShowCutModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    try {
      if (session) {
        const elapsed = performance.now() - syncPerformanceTime;
        let finalMs: number;
        if (session.syncMethod === 'manual') {
          finalMs = cameraTcMs + elapsed;
        } else {
          finalMs = elapsed;
        }
        await endSession(session.id, finalMs);
      }
      setIsRunning(false);
      navigation.reset({
        index: 0,
        routes: [{ name: 'SessionsList' }],
      });
    } catch (error: any) {
      console.error('End session error:', error);
    }
  };

  const getOffsetDisplay = (): string => {
    if (!session || session.syncMethod !== 'manual') return '';
    if (session.offsetMs === undefined || session.offsetMs === null) return '';
    const absMs = Math.abs(session.offsetMs);
    const sign = session.offsetMs >= 0 ? '+' : '-';
    return `${sign}${msToSmpte(absMs, session.frameRate)}`;
  };

  const getSyncTimeDisplay = (): string => {
    if (!session?.syncTime) return '';
    const d = new Date(session.syncTime);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  if (!session) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading session...</Text>
        </View>
      </View>
    );
  }

  const isActive = !session.isEnded;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      {/* Flash overlay on mark */}
      <Animated.View
        style={[
          styles.flashOverlay,
          { opacity: flashAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.15] }) },
        ]}
        pointerEvents="none"
      />

      {/* Background glows */}
      <View style={styles.bgGlowCoral} />
      <View style={styles.bgGlowTeal} />

      {/* Header — back only visible when session is ended */}
      <View style={styles.header}>
        {session.isEnded ? (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtnPlaceholder} />
        )}

        <View style={styles.headerCenter}>
          <Text style={styles.sessionName} numberOfLines={1}>
            {session.name}
          </Text>
        </View>

        {/* Ended label on the right when done */}
        {session.isEnded && (
          <View style={styles.endedLabel}>
            <Text style={styles.endedLabelText}>Ended</Text>
          </View>
        )}
        {!session.isEnded && <View style={styles.backBtnPlaceholder} />}
      </View>

      {/* Timecode Display */}
      <TimecodeDisplay
        syncPerformanceTime={syncPerformanceTime}
        cameraTcMs={cameraTcMs}
        fps={session.frameRate}
        syncMethod={session.syncMethod}
        isRunning={isRunning}
        frozenTimecode={frozenTimecode}
      />

      {/* Sync info bar */}
      <View style={styles.syncInfoBar}>
        <View style={styles.syncInfoItem}>
          <Text style={styles.syncInfoLabel}>METHOD</Text>
          <Text style={styles.syncInfoValue}>
            {session.syncMethod === 'manual' ? 'Manual' : 'Clap'}
          </Text>
        </View>
        {session.syncMethod === 'manual' && session.cameraTc && (
          <View style={styles.syncInfoItem}>
            <Text style={styles.syncInfoLabel}>OFFSET</Text>
            <Text style={[styles.syncInfoValue, { color: colors.teal.text }]}>
              {getOffsetDisplay()}
            </Text>
          </View>
        )}
        {session.syncMethod === 'manual' && session.syncTime && (
          <View style={styles.syncInfoItem}>
            <Text style={styles.syncInfoLabel}>SYNCED AT</Text>
            <Text style={styles.syncInfoValue}>{getSyncTimeDisplay()}</Text>
          </View>
        )}
        <View style={styles.syncInfoItem}>
          <Text style={styles.syncInfoLabel}>MARKERS</Text>
          <Text style={styles.syncInfoValue}>{markers.length}</Text>
        </View>
      </View>

      {/* Clap sync reminder */}
      {session.syncMethod === 'clap' && !session.isEnded && (
        <View style={styles.clapReminder}>
          <Text style={styles.clapReminderText}>
            ⚠ Editor must align SYNC marker to clap frame
          </Text>
        </View>
      )}

      {/* Marker List */}
      <View style={styles.listContainer}>
        <Text style={styles.listLabel}>MARKER LOG</Text>

        {markers.length === 0 ? (
          <View style={styles.emptyList}>
            <Text style={styles.emptyListText}>
              {session.syncMethod === 'clap'
                ? 'Tap MARK and clap simultaneously to create your sync reference'
                : 'Tap MARK to log your first marker'}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={markers}
            renderItem={({ item }) => (
              <MarkerListItem
                marker={item}
                onDelete={handleRequestDelete}
                onUpdateNote={handleUpdateNote}
                isLatest={item.id === latestMarkerId}
              />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Bottom bar: [Export] [MARK] [CUT] */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.sideBtn, isExporting && styles.sideBtnDisabled]}
          onPress={handleExport}
          activeOpacity={0.7}
          disabled={isExporting}
        >
          <Text style={styles.sideBtnText}>{isExporting ? '…' : 'Export'}</Text>
        </TouchableOpacity>

        <MarkButton
          onMark={handleMark}
          disabled={!isRunning}
          markerCount={markers.length}
        />

        {isActive ? (
          <TouchableOpacity
            style={[styles.sideBtn, styles.cutBtn]}
            onPress={() => setShowCutModal(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.sideBtnText, styles.cutText]}>CUT</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.sideBtn, styles.sideBtnDisabled]}>
            <Text style={[styles.sideBtnText, { color: colors.text.tertiary }]}>CUT</Text>
          </View>
        )}
      </View>

      {/* ── Glassmorphism Modals ── */}

      {/* CUT Session Modal */}
      <GlassModal
        visible={showCutModal}
        title="Cut Session"
        message={`Cut "${session.name}" and return to the sessions list? The timecode counter will stop and the session will be marked as complete.`}
        accent="coral"
        onClose={() => setShowCutModal(false)}
        actions={[
          {
            text: 'Cut',
            style: 'destructive',
            onPress: handleConfirmCut,
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setShowCutModal(false),
          },
        ]}
      />

      {/* Delete Marker Modal */}
      <GlassModal
        visible={showDeleteModal}
        title="Delete Marker"
        message="This marker will be permanently removed and remaining markers will be renumbered."
        accent="coral"
        onClose={() => setShowDeleteModal(false)}
        actions={[
          {
            text: 'Delete',
            style: 'destructive',
            onPress: handleConfirmDelete,
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => { setShowDeleteModal(false); setDeleteMarkerId(null); },
          },
        ]}
      />

      {/* No Markers Modal */}
      <GlassModal
        visible={showNoMarkersModal}
        title="No Markers"
        message="Log some markers before exporting."
        accent="amber"
        onClose={() => setShowNoMarkersModal(false)}
        actions={[
          {
            text: 'OK',
            onPress: () => setShowNoMarkersModal(false),
          },
        ]}
      />

      {/* Share / Export Format Modal */}
      <GlassModal
        visible={showShareModal}
        title="Share Export"
        message="Choose a format to share with your editor."
        accent="coral"
        onClose={() => setShowShareModal(false)}
        actions={[
          {
            text: 'CSV  —  Universal',
            onPress: () => {
              setShowShareModal(false);
              if (exportPaths) shareFile(exportPaths.csvPath, 'text/csv');
            },
          },
          {
            text: 'FCPXML  —  Final Cut Pro',
            onPress: () => {
              setShowShareModal(false);
              if (exportPaths) shareFile(exportPaths.fcpxmlPath, 'application/xml');
            },
          },
          {
            text: 'EDL  —  Premiere / Resolve',
            onPress: () => {
              setShowShareModal(false);
              if (exportPaths) shareFile(exportPaths.edlPath, 'text/plain');
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setShowShareModal(false),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.md,
    color: colors.text.tertiary,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.coral.main,
    zIndex: 100,
  },
  bgGlowCoral: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(232, 97, 58, 0.04)',
  },
  bgGlowTeal: {
    position: 'absolute',
    bottom: 100,
    left: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(34, 201, 137, 0.03)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: 56,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.glass.bg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPlaceholder: {
    width: 36,
    height: 36,
  },
  backText: {
    fontFamily: fonts.mono,
    fontSize: 24,
    color: colors.text.primary,
    lineHeight: 28,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  sessionName: {
    fontFamily: fonts.sans,
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary,
  },
  endedLabel: {
    width: 36,
    alignItems: 'flex-end',
  },
  endedLabelText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    letterSpacing: 0.5,
  },
  syncInfoBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.xl,
    backgroundColor: colors.glass.bg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: radius.md,
  },
  syncInfoItem: {
    alignItems: 'center',
  },
  syncInfoLabel: {
    fontFamily: fonts.mono,
    fontSize: 8,
    color: colors.text.tertiary,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  syncInfoValue: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.text.secondary,
  },
  clapReminder: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.amber.light,
    borderWidth: 1,
    borderColor: 'rgba(212, 147, 11, 0.3)',
    borderRadius: radius.sm,
  },
  clapReminderText: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.amber.text,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
  },
  listLabel: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    letterSpacing: 2,
    marginBottom: spacing.md,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  emptyList: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing['5xl'],
  },
  emptyListText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.md,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 260,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing['2xl'],
    paddingBottom: 36,
    paddingTop: spacing.md,
    backgroundColor: 'rgba(10, 10, 15, 0.9)',
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  sideBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.round,
    backgroundColor: colors.glass.bg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    minWidth: 80,
    alignItems: 'center',
  },
  sideBtnDisabled: {
    opacity: 0.4,
  },
  sideBtnText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  cutBtn: {
    borderColor: colors.coral.border,
    backgroundColor: colors.coral.light,
  },
  cutText: {
    color: colors.coral.text,
    fontWeight: '600',
  },
});
