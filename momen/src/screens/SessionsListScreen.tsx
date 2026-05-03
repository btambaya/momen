/**
 * SessionsListScreen — Home screen showing all sessions
 *
 * Glassmorphism design with frosted glass cards, subtle gradients,
 * micro-animations, and a search/filter bar.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fonts, fontSize, spacing, radius, shadows } from '../theme';
import { GlassCard } from '../components/GlassCard';
import { GlassModal } from '../components/GlassModal';
import { Session, RootStackParamList } from '../types';
import { getAllSessions, deleteSession } from '../database/sessionRepository';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type NavProp = NativeStackNavigationProp<RootStackParamList, 'SessionsList'>;

export function SessionsListScreen() {
  const navigation = useNavigation<NavProp>();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Session | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [])
  );

  const loadSessions = async () => {
    const data = await getAllSessions();
    // If there is an active (non-ended) session, go straight to it
    const active = data.find((s) => !s.isEnded);
    if (active) {
      navigation.replace('Logging', { sessionId: active.id });
      return;
    }
    setSessions(data);
  };

  // Filtered sessions based on search query
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase().trim();
    return sessions.filter((s) => {
      const name = s.name.toLowerCase();
      const date = formatDate(s.date || s.createdAt).toLowerCase();
      const method = s.syncMethod.toLowerCase();
      const fps = String(s.frameRate);
      return (
        name.includes(q) ||
        date.includes(q) ||
        method.includes(q) ||
        fps.includes(q)
      );
    });
  }, [sessions, searchQuery]);

  const handleDelete = (session: Session) => {
    setDeleteTarget(session);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteSession(deleteTarget.id);
    setDeleteTarget(null);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    loadSessions();
  };

  const renderSession = ({ item }: { item: Session }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => navigation.navigate('Logging', { sessionId: item.id })}
      onLongPress={() => handleDelete(item)}
    >
      <GlassCard elevated style={styles.sessionCard}>
        <View style={styles.cardContent}>
          <View style={styles.cardTop}>
            <Text style={styles.sessionName}>{item.name}</Text>
            <View style={styles.chevron}>
              <Text style={styles.chevronText}>›</Text>
            </View>
          </View>

          <Text style={styles.sessionDate}>{formatDate(item.date || item.createdAt)}</Text>

          <View style={styles.cardBottom}>
            <View style={styles.markerBadge}>
              <Text style={styles.markerCount}>
                {item.markerCount || 0} marker{(item.markerCount || 0) !== 1 ? 's' : ''}
              </Text>
            </View>

            <View style={styles.fpsBadge}>
              <Text style={styles.fpsText}>{item.frameRate} fps</Text>
            </View>

            <View
              style={[
                styles.syncBadge,
                item.syncMethod === 'manual' ? styles.syncManual : styles.syncClap,
              ]}
            >
              <Text
                style={[
                  styles.syncText,
                  item.syncMethod === 'manual'
                    ? { color: colors.coral.text }
                    : { color: colors.teal.text },
                ]}
              >
                {item.syncMethod === 'manual' ? 'Manual' : 'Clap'}
              </Text>
            </View>
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      {searchQuery.trim() ? (
        <>
          <Text style={styles.emptyTitle}>No results</Text>
          <Text style={styles.emptySubtitle}>
            No sessions match "{searchQuery}"
          </Text>
        </>
      ) : (
        <>
          <View style={styles.emptyIcon}>
            <Text style={styles.emptyIconText}>◎</Text>
          </View>
          <Text style={styles.emptyTitle}>No sessions yet</Text>
          <Text style={styles.emptySubtitle}>
            Create your first session to start logging timecoded markers on set.
          </Text>
        </>
      )}
    </View>
  );

  const showSearch = sessions.length > 0;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      {/* Background gradient effect */}
      <View style={styles.bgGlow} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>MOMEN</Text>
          <Text style={styles.tagline}>Timecoded marker logging</Text>
        </View>
        {sessions.length > 0 && (
          <View style={styles.sessionCountBadge}>
            <Text style={styles.sessionCountText}>{sessions.length}</Text>
          </View>
        )}
      </View>

      {/* Search bar */}
      {showSearch && (
        <View style={styles.searchWrapper}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={(text) => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setSearchQuery(text);
              }}
              placeholder="Search sessions..."
              placeholderTextColor={colors.text.tertiary}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setSearchQuery('');
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.clearBtn}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <Text style={styles.sectionLabel}>
        {searchQuery.trim()
          ? `${filteredSessions.length} RESULT${filteredSessions.length !== 1 ? 'S' : ''}`
          : 'YOUR SESSIONS'}
      </Text>

      <FlatList
        data={filteredSessions}
        renderItem={renderSession}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      {/* New Session Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.newButton}
          onPress={() => navigation.navigate('CreateSession')}
          activeOpacity={0.8}
        >
          <View style={styles.newButtonInner}>
            <Text style={styles.newButtonText}>New Session</Text>
            <Text style={styles.newButtonIcon}>+</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Delete Session Modal */}
      <GlassModal
        visible={deleteTarget !== null}
        title="Delete Session"
        message={`Delete "${deleteTarget?.name}" and all its markers? This cannot be undone.`}
        accent="coral"
        onClose={() => setDeleteTarget(null)}
        actions={[
          {
            text: 'Delete',
            style: 'destructive',
            onPress: handleConfirmDelete,
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setDeleteTarget(null),
          },
        ]}
      />
    </View>
  );
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).toUpperCase();
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  bgGlow: {
    position: 'absolute',
    top: -100,
    right: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(232, 97, 58, 0.05)',
    shadowColor: colors.coral.main,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 80,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: 60,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logo: {
    fontFamily: fonts.mono,
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary,
    letterSpacing: 4,
  },
  tagline: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    letterSpacing: 1,
    marginTop: 4,
  },
  sessionCountBadge: {
    backgroundColor: colors.glass.bgActive,
    borderWidth: 1,
    borderColor: colors.glass.borderLight,
    borderRadius: radius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginTop: 4,
  },
  sessionCountText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  searchWrapper: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glass.bg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : 0,
    gap: spacing.sm,
  },
  searchIcon: {
    fontFamily: fonts.mono,
    fontSize: fontSize.lg,
    color: colors.text.tertiary,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: fontSize.base,
    color: colors.text.primary,
    padding: 0,
    margin: 0,
  },
  clearBtn: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    color: colors.text.tertiary,
    padding: spacing.xs,
  },
  sectionLabel: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    letterSpacing: 2,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 120,
  },
  sessionCard: {
    marginBottom: spacing.md,
  },
  cardContent: {
    padding: spacing.xl,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionName: {
    fontFamily: fonts.sans,
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  chevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.glass.bg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xl,
    color: colors.text.tertiary,
    lineHeight: 22,
  },
  sessionDate: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    letterSpacing: 1,
    marginTop: spacing.xs,
  },
  cardBottom: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  markerBadge: {
    backgroundColor: colors.glass.bg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: radius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  markerCount: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  fpsBadge: {
    backgroundColor: colors.glass.bg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: radius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  fpsText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  syncBadge: {
    borderRadius: radius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
  },
  syncManual: {
    backgroundColor: colors.coral.light,
    borderColor: colors.coral.border,
  },
  syncClap: {
    backgroundColor: colors.teal.light,
    borderColor: colors.teal.border,
  },
  syncText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: spacing['3xl'],
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.glass.bg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  emptyIconText: {
    fontSize: 36,
    color: colors.text.tertiary,
  },
  emptyTitle: {
    fontFamily: fonts.sans,
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontFamily: fonts.sans,
    fontSize: fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
    paddingBottom: 36,
    paddingTop: spacing.lg,
    // Frosted bottom bar
    backgroundColor: 'rgba(10, 10, 15, 0.85)',
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
  newButton: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.coral.main,
    ...shadows.elevated,
    shadowColor: colors.coral.main,
  },
  newButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  newButtonText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: '#fff',
  },
  newButtonIcon: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xl,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
  },
});
