import 'package:http/http.dart' as http;
import 'dart:convert';
import 'database_helper.dart';

class SyncService {
  // TODO: Replace with your actual Render backend URL once deployed (e.g., https://adama-backend.onrender.com)
  final String apiUrl = 'https://smartcitizenreportingsystem.onrender.com/api/v1/reports/'; // Production API

  Future<void> syncPendingReports() async {
    final dbHelper = DatabaseHelper();
    final pendingReports = await dbHelper.getPendingReports();

    if (pendingReports.isEmpty) return;

    for (var report in pendingReports) {
      try {
        final response = await http.post(
          Uri.parse(apiUrl),
          headers: {
            'Content-Type': 'application/json',
            // In a real app, include Authorization JWT header
          },
          body: jsonEncode({
            'category': report['category_id'],
            'description': report['description'],
            'latitude': report['latitude'],
            'longitude': report['longitude'],
            'is_emergency': report['is_emergency'] == 1,
          }),
        );

        if (response.statusCode == 201) {
          // Successfully synced, update local status
          await dbHelper.updateReportStatus(report['id'], 'SYNCED');
          
          // Next step would be to sync media for this report
        }
      } catch (e) {
        // Handle network error, leave as PENDING_UPLOAD
        print('Sync failed for report ${report['id']}: $e');
      }
    }
  }
}
