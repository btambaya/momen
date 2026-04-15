/**
 * Momen — Export Manager
 *
 * Generates all three export formats simultaneously and presents
 * the iOS share sheet.
 */

import { File, Paths, Directory } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { Session, Marker } from '../types';
import { generateCSV } from './csvExporter';
import { generateFCPXML } from './fcpxmlExporter';
import { generateEDL } from './edlExporter';

const CLAP_SYNC_MESSAGE =
  'Your export includes a SYNC marker. Share these files with your editor and ask them to align the SYNC marker to the frame of the clap in your footage. This will automatically align all subsequent markers to the correct position on the timeline.';

export interface ExportResult {
  csvPath: string;
  fcpxmlPath: string;
  edlPath: string;
}

/**
 * Generate all export files and return their paths.
 */
export async function generateExportFiles(
  session: Session,
  markers: Marker[]
): Promise<ExportResult> {
  const dateStr = formatDate(session.date || session.createdAt);
  const safeName = session.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const baseName = `${safeName}_${dateStr}_markers`;

  // Ensure export directory exists
  const exportDir = new Directory(Paths.cache, 'momen_exports');
  if (!exportDir.exists) {
    exportDir.create();
  }

  // Generate all three formats
  const csvContent = generateCSV(markers, session.frameRate);
  const fcpxmlContent = generateFCPXML(session, markers);
  const edlContent = generateEDL(session, markers);

  // Write files using the new File API
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
 * Export and share files. For clap sync sessions, shows
 * the confirmation message first.
 */
export async function exportAndShare(
  session: Session,
  markers: Marker[]
): Promise<void> {
  if (markers.length === 0) {
    Alert.alert('No Markers', 'Log some markers before exporting.');
    return;
  }

  try {
    const result = await generateExportFiles(session, markers);

    // For clap sync, show confirmation screen first
    if (session.syncMethod === 'clap') {
      return new Promise<void>((resolve) => {
        Alert.alert(
          'Clap Sync Export',
          CLAP_SYNC_MESSAGE,
          [
            {
              text: 'Share Files',
              onPress: async () => {
                await shareFiles(result);
                resolve();
              },
            },
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => resolve(),
            },
          ]
        );
      });
    } else {
      await shareFiles(result);
    }
  } catch (error: any) {
    Alert.alert('Export Error', error.message || 'Failed to generate export files.');
  }
}

/**
 * Share export files via the iOS share sheet.
 */
async function shareFiles(result: ExportResult): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();

  if (!isAvailable) {
    Alert.alert(
      'Sharing Unavailable',
      'Sharing is not available on this device. Files have been saved to the app cache.'
    );
    return;
  }

  // Share files sequentially — user picks format
  Alert.alert(
    'Share Export',
    'Choose a format to share:',
    [
      {
        text: 'CSV (Universal)',
        onPress: () => Sharing.shareAsync(result.csvPath, { mimeType: 'text/csv' }),
      },
      {
        text: 'FCPXML (Final Cut Pro)',
        onPress: () => Sharing.shareAsync(result.fcpxmlPath, { mimeType: 'application/xml' }),
      },
      {
        text: 'EDL (Premiere/Resolve)',
        onPress: () => Sharing.shareAsync(result.edlPath, { mimeType: 'text/plain' }),
      },
      {
        text: 'Share All',
        onPress: async () => {
          await Sharing.shareAsync(result.csvPath, { mimeType: 'text/csv' });
          await Sharing.shareAsync(result.fcpxmlPath, { mimeType: 'application/xml' });
          await Sharing.shareAsync(result.edlPath, { mimeType: 'text/plain' });
        },
      },
    ]
  );
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}
