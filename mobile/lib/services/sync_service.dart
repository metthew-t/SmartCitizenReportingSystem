import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'api_config.dart';
import 'database_helper.dart';

/// Offline-first sync service.
/// Queues reports when offline and auto-syncs when connectivity returns.
class SyncService {
  static final SyncService _instance = SyncService._internal();
  factory SyncService() => _instance;
  SyncService._internal();

  Timer? _syncTimer;
  bool _isSyncing = false;

  // Stream to notify UI about pending count changes
  final StreamController<int> _pendingCountController =
      StreamController<int>.broadcast();
  Stream<int> get pendingCountStream => _pendingCountController.stream;

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  /// Start periodic sync check every 30 seconds.
  void startPeriodicSync() {
    _syncTimer?.cancel();
    _syncTimer = Timer.periodic(const Duration(seconds: 30), (_) => syncNow());
    // Also attempt immediately
    syncNow();
  }

  void stopSync() {
    _syncTimer?.cancel();
    _syncTimer = null;
  }

  // ── Core sync ──────────────────────────────────────────────────────────────

  /// Try to sync all pending offline reports to the server.
  /// Safe to call multiple times — guards against concurrent runs.
  Future<int> syncNow() async {
    if (_isSyncing) return 0;
    _isSyncing = true;
    int synced = 0;

    try {
      final db = DatabaseHelper();
      final pending = await db.getPendingReports();
      if (pending.isEmpty) {
        await _broadcastPendingCount();
        return 0;
      }

      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');
      if (token == null) {
        // No auth token — cannot sync yet
        return 0;
      }

      for (final report in pending) {
        final localId = report['local_id'] as String;
        try {
          final payload = <String, dynamic>{
            'description': report['description'],
            'latitude': report['latitude'],
            'longitude': report['longitude'],
            'department_name': report['department_name'] ?? '',
            'priority': report['priority'] ?? 'MEDIUM',
            'aanaa': report['aanaa'] ?? '',
            'kuta_magaalaa': report['kuta_magaalaa'] ?? '',
            'kebele': report['kebele'] ?? '',
            'iddoo_addaa': report['iddoo_addaa'] ?? '',
          };

          final response = await http
              .post(
                Uri.parse('${ApiConfig.baseUrl}/reports/'),
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer $token',
                },
                body: jsonEncode(payload),
              )
              .timeout(const Duration(seconds: 20));

          if (response.statusCode == 201) {
            // Upload image if queued
            final imagePath = report['image_path'] as String? ?? '';
            if (imagePath.isNotEmpty) {
              final decoded = jsonDecode(response.body);
              final reportId = decoded['id']?.toString();
              if (reportId != null) {
                await _uploadOfflineImage(reportId, imagePath, token);
              }
            }
            await db.markSynced(localId);
            synced++;
          } else if (response.statusCode == 400 || response.statusCode == 403) {
            // Permanent failure — mark as failed so it doesn't retry forever
            await db.markFailed(localId, 'Server error ${response.statusCode}: ${response.body}');
          }
          // 401 / 5xx — leave as PENDING to retry later
        } on SocketException {
          // No internet — stop trying this cycle
          break;
        } catch (e) {
          await db.markFailed(localId, e.toString());
        }
      }
    } finally {
      _isSyncing = false;
      await _broadcastPendingCount();
    }
    return synced;
  }

  Future<void> _uploadOfflineImage(
      String reportId, String imagePath, String token) async {
    try {
      final file = File(imagePath);
      if (!await file.exists()) return;
      final uri = Uri.parse('${ApiConfig.baseUrl}/reports/$reportId/upload_media/');
      final req = http.MultipartRequest('POST', uri);
      req.headers['Authorization'] = 'Bearer $token';
      req.files.add(await http.MultipartFile.fromPath('file', imagePath));
      req.fields['media_type'] = 'IMAGE';
      await req.send().timeout(const Duration(seconds: 30));
    } catch (_) {
      // Image upload failure is non-fatal — the report text was synced
    }
  }

  Future<void> _broadcastPendingCount() async {
    try {
      final count = await DatabaseHelper().getPendingCount();
      if (!_pendingCountController.isClosed) {
        _pendingCountController.add(count);
      }
    } catch (_) {}
  }

  // ── Offline queue entry point ─────────────────────────────────────────────

  /// Save a report locally when offline. Returns the local ID.
  Future<String> queueOfflineReport(Map<String, dynamic> payload) async {
    final localId = await DatabaseHelper().queueReport(payload);
    await _broadcastPendingCount();
    // Attempt immediate sync in case we're back online
    syncNow();
    return localId;
  }

  Future<int> getPendingCount() async {
    return DatabaseHelper().getPendingCount();
  }
}
