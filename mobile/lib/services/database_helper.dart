import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

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
    String path = join(await getDatabasesPath(), 'adama_offline.db');
    return await openDatabase(
      path,
      version: 1,
      onCreate: _onCreate,
    );
  }

  Future<void> _onCreate(Database db, int version) async {
    await db.execute('''
      CREATE TABLE offline_reports(
        id TEXT PRIMARY KEY,
        category_id INTEGER,
        description TEXT,
        latitude REAL,
        longitude REAL,
        is_emergency INTEGER,
        created_at TEXT,
        status TEXT DEFAULT 'PENDING_UPLOAD'
      )
    ''');

    await db.execute('''
      CREATE TABLE offline_media(
        id TEXT PRIMARY KEY,
        report_id TEXT,
        media_type TEXT,
        local_path TEXT,
        uploaded INTEGER DEFAULT 0
      )
    ''');
  }

  Future<void> insertReport(Map<String, dynamic> reportData) async {
    final db = await database;
    await db.insert(
      'offline_reports',
      reportData,
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<List<Map<String, dynamic>>> getPendingReports() async {
    final db = await database;
    return await db.query(
      'offline_reports',
      where: 'status = ?',
      whereArgs: ['PENDING_UPLOAD'],
    );
  }

  Future<void> updateReportStatus(String id, String status) async {
    final db = await database;
    await db.update(
      'offline_reports',
      {'status': status},
      where: 'id = ?',
      whereArgs: [id],
    );
  }
}
