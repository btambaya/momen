/**
 * Momen — Export Manager
 *
 * Generates all three export formats simultaneously and presents
 * the share sheet via a custom GlassModal (called from LoggingScreen).
 */

import { File, Paths, Directory } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { Session, Marker, FrameRate } from '../types';
import { generateCSV } from './csvExporter';
import { generateFCPXML } from './fcpxmlExporter';
import { generateEDL } from './edlExporter';

export interface ExportResult {
  csvPath: string;
  fcpxmlPath: string;
  edlPath: string;
}

/**
 * Convert a FrameRate to a filename-safe string.
 * 23.976 → "23976fps", 29.97 → "2997fps", 24 → "24fps" etc.
 */
export function fpsToFilenamePart(fps: FrameRate): string {
  return `${String(fps).replace('.', '')}fps`;
}

/**
 * Generate all export files and return their paths.
 * Filename: {SessionName}_{YYYYMMDD}_{fps}fps_markers.{ext}
 */
export async function generateExportFiles(
  session: Session,
  markers: Marker[]
): Promise<ExportResult> {
  const dateStr = formatDate(session.date || session.createdAt);
  const safeName = session.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fpsPart = fpsToFilenamePart(session.frameRate);
  const baseName = `${safeName}_${dateStr}_${fpsPart}_markers`;

  // Ensure export directory exists
  const exportDir = new Directory(Paths.cache, 'momen_exports');
  if (!exportDir.exists) {
    exportDir.create();
  }

  // Generate all three formats
  const csvContent = generateCSV(markers, session.frameRate);
  const fcpxmlContent = generateFCPXML(session, markers);
  const edlContent = generateEDL(session, markers);

  // Write files
  const csvFile = new File(exportDir, `${baseName}.csv`);
  const fcpxmlFile = new File(exportDir, `${baseName}.fcpxml`);
  const edlFile = new File(exportDir, `${baseName}.edl`);

  csvFile.write(csvContent);
  fcpxmlFile.write(fcpxmlContent);
  edlFile.write(edlContent);

  return {
    csvPath: csvFile.uri,
    fcpxmlPath: fcpxmlFile.uri,
    edlPath: edlFile.uri,
  };
}

/**
 * Share a single file via the native share sheet.
 * Called from LoggingScreen after the user selects a format in the GlassModal.
 */
export async function shareFile(uri: string, mimeType: string): Promise<void> {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert(
        'Sharing Unavailable',
        'Sharing is not available on this device. Files have been saved to the app cache.'
      );
      return;
    }
    await Sharing.shareAsync(uri, { mimeType });
  } catch (error: any) {
    Alert.alert('Share Error', error.message || 'Failed to share file.');
  }
}

// ─── Helpers ─────────────────────────────────────────────────

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}
