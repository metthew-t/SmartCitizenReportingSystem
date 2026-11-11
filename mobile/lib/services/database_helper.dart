import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

/// Local SQLite database for offline-first report queuing.
/// Reports submitted without internet are stored here and synced automatically
/// when connectivity is restored.
class DatabaseHelper {
  static final DatabaseHelper _instance = DatabaseHelper._internal();
  factory DatabaseHelper() => _instance;
  DatabaseHelper._internal();

  static Database? _database;

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    return _database!;
  }

  Future<Database> _initDatabase() async {
    final path = join(await getDatabasesPath(), 'adama_offline_v2.db');
    return openDatabase(path, version: 2, onCreate: _onCreate, onUpgrade: _onUpgrade);
  }

  Future<void> _onCreate(Database db, int version) async {
    // Offline report queue — stores full submission payload
    await db.execute('''
      CREATE TABLE IF NOT EXISTS offline_reports (
        local_id   TEXT    PRIMARY KEY,
        description TEXT   NOT NULL,
        latitude   REAL    NOT NULL,
        longitude  REAL    NOT NULL,
        department_name TEXT,
        priority   TEXT    DEFAULT 'MEDIUM',
        aanaa      TEXT,
        kuta_magaalaa TEXT,
        kebele     TEXT,
        iddoo_addaa TEXT,
        image_path TEXT,
        status     TEXT    DEFAULT 'PENDING',
        created_at TEXT    NOT NULL,
        error_msg  TEXT
      )
    ''');

    // Cached server reports (read-only, refreshed on sync)
    await db.execute('''
      CREATE TABLE IF NOT EXISTS cached_reports (
        id           TEXT PRIMARY KEY,
        case_number  TEXT,
        description  TEXT,
        status       TEXT,
        priority     TEXT,
        department   TEXT,
        category     TEXT,
        created_at   TEXT,
        latitude     REAL,
        longitude    REAL,
        sla_hours_remaining REAL,
        is_sla_breached INTEGER DEFAULT 0,
        affected_count INTEGER DEFAULT 1,
        is_within_geofence INTEGER DEFAULT 1,
        cached_at    TEXT
      )
    ''');
  }

  Future<void> _onUpgrade(Database db, int oldVersion, int newVersion) async {
    if (oldVersion < 2) {
      // Migrate old schema
      try { await db.execute('DROP TABLE IF EXISTS offline_reports'); } catch (_) {}
      try { await db.execute('DROP TABLE IF EXISTS offline_media'); } catch (_) {}
      await _onCreate(db, newVersion);
    }
  }

  // ── Offline queue ──────────────────────────────────────────────────────────

  Future<String> queueReport(Map<String, dynamic> payload) async {
    final db = await database;
    final localId = 'local_${DateTime.now().millisecondsSinceEpoch}';
    await db.insert('offline_reports', {
      'local_id': localId,
      'description': payload['description'] ?? '',
      'latitude': payload['latitude'] ?? 0.0,
      'longitude': payload['longitude'] ?? 0.0,
      'department_name': payload['department_name'] ?? '',
      'priority': payload['priority'] ?? 'MEDIUM',
      'aanaa': payload['aanaa'] ?? '',
      'kuta_magaalaa': payload['kuta_magaalaa'] ?? '',
      'kebele': payload['kebele'] ?? '',
      'iddoo_addaa': payload['iddoo_addaa'] ?? '',
      'image_path': payload['image_path'] ?? '',
      'status': 'PENDING',
      'created_at': DateTime.now().toIso8601String(),
    }, conflictAlgorithm: ConflictAlgorithm.replace);
    return localId;
  }

  Future<List<Map<String, dynamic>>> getPendingReports() async {
    final db = await database;
    return db.query('offline_reports', where: 'status = ?', whereArgs: ['PENDING']);
  }

  Future<int> getPendingCount() async {
    final db = await database;
    final result = await db.rawQuery(
        "SELECT COUNT(*) as cnt FROM offline_reports WHERE status = 'PENDING'");
    return (result.first['cnt'] as int?) ?? 0;
  }

  Future<void> markSynced(String localId) async {
    final db = await database;
    await db.update('offline_reports', {'status': 'SYNCED'},
        where: 'local_id = ?', whereArgs: [localId]);
  }

  Future<void> markFailed(String localId, String error) async {
    final db = await database;
    await db.update('offline_reports', {'status': 'FAILED', 'error_msg': error},
        where: 'local_id = ?', whereArgs: [localId]);
  }

  Future<void> deleteReport(String localId) async {
    final db = await database;
    await db.delete('offline_reports', where: 'local_id = ?', whereArgs: [localId]);
  }

  // ── Report cache ───────────────────────────────────────────────────────────

  Future<void> cacheReports(List<Map<String, dynamic>> reports) async {
    final db = await database;
    final batch = db.batch();
    final now = DateTime.now().toIso8601String();
    for (final r in reports) {
      batch.insert('cached_reports', {
        'id': r['id'].toString(),
        'case_number': r['case_number'] ?? '',
        'description': r['description'] ?? '',
        'status': r['status'] ?? 'SUBMITTED',
        'priority': r['priority'] ?? 'MEDIUM',
        'department': r['department_name'] ?? '',
        'category': r['category_name'] ?? '',
        'created_at': r['created_at'] ?? '',
        'latitude': (r['latitude'] ?? 0.0).toDouble(),
        'longitude': (r['longitude'] ?? 0.0).toDouble(),
        'sla_hours_remaining': _extractSlaHours(r),
        'is_sla_breached': (_extractSlaBreached(r) ? 1 : 0),
        'affected_count': r['affected_count'] ?? 1,
        'is_within_geofence': ((r['is_within_geofence'] ?? true) ? 1 : 0),
        'cached_at': now,
      }, conflictAlgorithm: ConflictAlgorithm.replace);
    }
    await batch.commit(noResult: true);
  }

  Future<List<Map<String, dynamic>>> getCachedReports() async {
    final db = await database;
    return db.query('cached_reports', orderBy: 'created_at DESC');
  }

  /// Telegram-style combined list:
  /// Returns pending offline reports FIRST (waiting for sync 🕒),
  /// followed by all previously cached server reports.
  Future<List<Map<String, dynamic>>> getAllReportsForDisplay() async {
    final db = await database;
    final List<Map<String, dynamic>> combined = [];

    // 1. Pending offline reports (waiting for internet)
    final pending = await db.query(
      'offline_reports',
      where: "status = 'PENDING'",
      orderBy: 'created_at DESC',
    );
    for (final p in pending) {
      combined.add({
        'id': p['local_id'],
        'case_number': '🕒 Sync Pending',
        'description': p['description'] ?? '',
        'status': 'PENDING_SYNC',
        'priority': p['priority'] ?? 'MEDIUM',
        'department': p['department_name'] ?? 'General',
        'category': 'General',
        'created_at': p['created_at'] ?? DateTime.now().toIso8601String(),
        'latitude': (p['latitude'] as num? ?? 8.54).toDouble(),
        'longitude': (p['longitude'] as num? ?? 39.27).toDouble(),
        'sla_hours_remaining': null,
        'is_sla_breached': 0,
        'affected_count': 1,
        'is_within_geofence': 1,
        'is_offline_pending': true,
        'image_path': p['image_path'] ?? '',
      });
    }

    // 2. Cached server reports
    final cached = await db.query('cached_reports', orderBy: 'created_at DESC');
    for (final c in cached) {
      final copy = Map<String, dynamic>.from(c);
      copy['is_offline_pending'] = false;
      combined.add(copy);
    }

    return combined;
  }

  double? _extractSlaHours(Map<String, dynamic> r) {
    try {
      final sla = r['sla_metrics'];
      if (sla is Map) {
        final val = sla['remaining_hours'];
        return val != null ? (val as num).toDouble() : null;
      }
    } catch (_) {}
    return null;
  }

  bool _extractSlaBreached(Map<String, dynamic> r) {
    try {
      final sla = r['sla_metrics'];
      if (sla is Map) return sla['is_breached'] == true;
    } catch (_) {}
    return false;
  }
}
