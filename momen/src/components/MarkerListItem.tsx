/**
 * MarkerListItem — Displays a single marker in the session list
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { colors, fonts, fontSize, spacing, radius } from '../theme';
import { Marker } from '../types';

interface MarkerListItemProps {
  marker: Marker;
  onDelete: (id: string) => void;
  onUpdateNote: (id: string, note: string) => void;
  isLatest?: boolean;
}

export function MarkerListItem({
  marker,
  onDelete,
  onUpdateNote,
  isLatest = false,
}: MarkerListItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [noteText, setNoteText] = useState(marker.note);

  const handleSaveNote = () => {
    setIsEditing(false);
    if (noteText !== marker.note) {
      onUpdateNote(marker.id, noteText);
    }
  };

  return (
    <View style={[styles.container, marker.isSyncPoint && styles.syncContainer]}>
      {/* Left accent line */}
      <View style={[styles.accent, marker.isSyncPoint && styles.syncAccent]} />

      <View style={styles.content}>
        <View style={styles.topRow}>
          {/* Marker number badge */}
          <View style={[styles.numberBadge, marker.isSyncPoint && styles.syncBadge]}>
            <Text style={[styles.numberText, marker.isSyncPoint && styles.syncBadgeText]}>
              {marker.isSyncPoint ? 'SYNC' : `#${marker.markerNumber}`}
            </Text>
          </View>

          {/* Timecode */}
          <Text style={styles.timecode}>{marker.timecodeSmpte}</Text>

          {/* Delete button */}
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => onDelete(marker.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.deleteText}>×</Text>
          </TouchableOpacity>
        </View>

        {/* Note display or edit */}
        {(marker.note || isEditing) && (
          <View style={styles.noteRow}>
            {isEditing ? (
              <TextInput
                style={styles.noteInput}
                value={noteText}
                onChangeText={setNoteText}
                placeholder="Add a note..."
                placeholderTextColor={colors.text.tertiary}
                autoFocus
                onBlur={handleSaveNote}
                onSubmitEditing={handleSaveNote}
                returnKeyType="done"
              />
            ) : (
              <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.noteTouchable}>
                <Text style={styles.noteText} numberOfLines={1}>
                  {marker.isSyncPoint
                    ? 'Sync reference point — align in NLE'
                    : marker.note}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Tap to add note (if no note and not editing) */}
        {!marker.note && !isEditing && !marker.isSyncPoint && (
          <TouchableOpacity onPress={() => setIsEditing(true)}>
            <Text style={styles.addNote}>+ add note</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.glass.bg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  syncContainer: {
    borderColor: colors.teal.border,
    backgroundColor: colors.teal.light,
  },
  accent: {
    width: 3,
    backgroundColor: colors.coral.main,
  },
  syncAccent: {
    backgroundColor: colors.teal.main,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  numberBadge: {
    backgroundColor: colors.glass.bgActive,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  syncBadge: {
    backgroundColor: colors.teal.main,
  },
  numberText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text.primary,
  },
  syncBadgeText: {
    color: '#fff',
  },
  timecode: {
    fontFamily: fonts.mono,
    fontSize: fontSize.md,
    color: colors.text.primary,
    flex: 1,
    letterSpacing: 0.5,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.glass.bg,
    borderWidth: 1,
    borderColor: colors.glass.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    fontFamily: fonts.mono,
    fontSize: fontSize.lg,
    color: colors.text.tertiary,
    lineHeight: 20,
  },
  noteRow: {
    marginTop: spacing.xs,
  },
  noteText: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  noteTouchable: {
    paddingVertical: 2,
  },
  noteInput: {
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
    color: colors.text.primary,
    backgroundColor: colors.glass.bg,
    borderWidth: 1,
    borderColor: colors.glass.borderLight,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  addNote: {
    fontFamily: fonts.mono,
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
});
