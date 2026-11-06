/// Adama Smart Citizen Reporting System — Design Token System
///
/// Aligned with:
/// - GOV.UK Design System
/// - U.S. Web Design System (USWDS)
/// - Singapore OneService
/// - Open311 GeoReport Protocol
/// - WCAG 2.1 AA/AAA accessibility compliance
library adama_theme;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────

class CivicColors {
  CivicColors._();

  // ── Brand ──────────────────────────────────────────────────────────────────
  static const Color navyDeep     = Color(0xFF0F2942); // Deep Navy — authority
  static const Color govBlue      = Color(0xFF1D70B8); // Gov Blue — trust/primary
  static const Color govBlueDark  = Color(0xFF0D5C99); // Pressed state
  static const Color forestTeal   = Color(0xFF0E7490); // Civic Teal — secondary
  static const Color emeraldGreen = Color(0xFF059669); // Resolution/Success
  static const Color emeraldLight = Color(0xFF10B981); // Success lighter

  // ── Canvas / Surfaces — Light ──────────────────────────────────────────────
  static const Color canvasLight        = Color(0xFFF8FAFC); // Slate 50
  static const Color surfaceLight       = Color(0xFFFFFFFF); // Card
  static const Color surfaceBorderLight = Color(0xFFE2E8F0); // Slate 200
  static const Color surfaceMutedLight  = Color(0xFFF1F5F9); // Slate 100

  // ── Canvas / Surfaces — Dark ───────────────────────────────────────────────
  static const Color canvasDark        = Color(0xFF0F172A); // Slate 900
  static const Color surfaceDark       = Color(0xFF1E293B); // Slate 800
  static const Color surfaceBorderDark = Color(0xFF334155); // Slate 700

  // ── Text ───────────────────────────────────────────────────────────────────
  static const Color textPrimary   = Color(0xFF0F172A); // Slate 900
  static const Color textSecondary = Color(0xFF475569); // Slate 600
  static const Color textMuted     = Color(0xFF94A3B8); // Slate 400
  static const Color textInverse   = Color(0xFFF8FAFC); // On dark surfaces

  // ── Semantic Status Colors ─────────────────────────────────────────────────
  // SUBMITTED / RECEIVED
  static const Color statusNew        = Color(0xFF3B82F6); // Sky Blue
  static const Color statusNewBg      = Color(0xFFEFF6FF);
  static const Color statusNewText    = Color(0xFF1D4ED8);

  // ASSIGNED / INVESTIGATING
  static const Color statusAction     = Color(0xFFF59E0B); // Amber
  static const Color statusActionBg   = Color(0xFFFFFBEB);
  static const Color statusActionText = Color(0xFFB45309);

  // IN PROGRESS / DISPATCHED
  static const Color statusProgress   = Color(0xFF8B5CF6); // Purple
  static const Color statusProgressBg = Color(0xFFF5F3FF);
  static const Color statusProgressText = Color(0xFF6D28D9);

  // RESOLVED
  static const Color statusSolved     = Color(0xFF10B981); // Emerald
  static const Color statusSolvedBg   = Color(0xFFECFDF5);
  static const Color statusSolvedText = Color(0xFF047857);

  // CLOSED
  static const Color statusClosed     = Color(0xFF64748B); // Slate
  static const Color statusClosedBg   = Color(0xFFF1F5F9);
  static const Color statusClosedText = Color(0xFF334155);

  // REJECTED
  static const Color statusRejected     = Color(0xFFEF4444); // Crimson
  static const Color statusRejectedBg   = Color(0xFFFEF2F2);
  static const Color statusRejectedText = Color(0xFFB91C1C);

  // REOPENED / APPEALED
  static const Color statusAppealed     = Color(0xFFEC4899); // Rose
  static const Color statusAppealedBg   = Color(0xFFFDF2F8);
  static const Color statusAppealedText = Color(0xFFBE185D);

  // ── SLA Status ─────────────────────────────────────────────────────────────
  static const Color slaOnTrack     = Color(0xFF10B981);
  static const Color slaNearing     = Color(0xFFF59E0B);
  static const Color slaBreached    = Color(0xFFEF4444);

  // ── Priority ───────────────────────────────────────────────────────────────
  static const Color priorityCritical = Color(0xFFDC2626);
  static const Color priorityHigh     = Color(0xFFF59E0B);
  static const Color priorityMedium   = Color(0xFF3B82F6);
  static const Color priorityLow      = Color(0xFF94A3B8);

  // ── Focus Ring (WCAG AA high-visibility) ──────────────────────────────────
  static const Color focusRing = Color(0xFFFDE047); // Gov yellow

  // ── Destructive ───────────────────────────────────────────────────────────
  static const Color dangerBg     = Color(0xFFFEF2F2);
  static const Color dangerBorder = Color(0xFFFCA5A5);
  static const Color dangerText   = Color(0xFFDC2626);

  // ── Warning ───────────────────────────────────────────────────────────────
  static const Color warningBg   = Color(0xFFFFFBEB);
  static const Color warningText = Color(0xFFB45309);

  // ── Info ──────────────────────────────────────────────────────────────────
  static const Color infoBg   = Color(0xFFEFF6FF);
  static const Color infoText = Color(0xFF1D4ED8);
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPOGRAPHY SCALE
// ─────────────────────────────────────────────────────────────────────────────

class CivicText {
  CivicText._();

  // Display / Page Title
  static const TextStyle display = TextStyle(
    fontSize: 30, fontWeight: FontWeight.w800,
    letterSpacing: -0.5, height: 1.2,
    color: CivicColors.textPrimary,
  );

  // Section Header
  static const TextStyle h2 = TextStyle(
    fontSize: 21, fontWeight: FontWeight.w700,
    letterSpacing: -0.3, height: 1.3,
    color: CivicColors.textPrimary,
  );

  // Card Title / Panel Header
  static const TextStyle h3 = TextStyle(
    fontSize: 16, fontWeight: FontWeight.w700,
    letterSpacing: -0.1, height: 1.4,
    color: CivicColors.textPrimary,
  );

  // Sub-label
  static const TextStyle label = TextStyle(
    fontSize: 13, fontWeight: FontWeight.w600,
    color: CivicColors.textSecondary,
  );

  // Body
  static const TextStyle body = TextStyle(
    fontSize: 14, fontWeight: FontWeight.w400,
    height: 1.6, color: CivicColors.textPrimary,
  );

  // Body medium weight
  static const TextStyle bodyMedium = TextStyle(
    fontSize: 14, fontWeight: FontWeight.w500,
    height: 1.6, color: CivicColors.textPrimary,
  );

  // Micro / Badge / Timestamp
  static const TextStyle micro = TextStyle(
    fontSize: 11, fontWeight: FontWeight.w700,
    letterSpacing: 0.05, height: 1.3,
    color: CivicColors.textSecondary,
  );

  // Case number
  static const TextStyle caseNumber = TextStyle(
    fontSize: 12, fontWeight: FontWeight.w600,
    letterSpacing: 0.02, color: CivicColors.govBlue,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS HELPERS
// ─────────────────────────────────────────────────────────────────────────────

class CivicStatus {
  CivicStatus._();

  static Color foreground(String status) {
    switch (status.toUpperCase()) {
      case 'SUBMITTED':
      case 'RECEIVED':   return CivicColors.statusNewText;
      case 'ASSIGNED':
      case 'UNDER_INVESTIGATION': return CivicColors.statusActionText;
      case 'IN_PROGRESS': return CivicColors.statusProgressText;
      case 'RESOLVED':   return CivicColors.statusSolvedText;
      case 'CLOSED':     return CivicColors.statusClosedText;
      case 'REJECTED':   return CivicColors.statusRejectedText;
      case 'REOPENED':
      case 'APPEALED':   return CivicColors.statusAppealedText;
      default:           return CivicColors.textSecondary;
    }
  }

  static Color background(String status) {
    switch (status.toUpperCase()) {
      case 'SUBMITTED':
      case 'RECEIVED':   return CivicColors.statusNewBg;
      case 'ASSIGNED':
      case 'UNDER_INVESTIGATION': return CivicColors.statusActionBg;
      case 'IN_PROGRESS': return CivicColors.statusProgressBg;
      case 'RESOLVED':   return CivicColors.statusSolvedBg;
      case 'CLOSED':     return CivicColors.statusClosedBg;
      case 'REJECTED':   return CivicColors.statusRejectedBg;
      case 'REOPENED':
      case 'APPEALED':   return CivicColors.statusAppealedBg;
      default:           return CivicColors.surfaceMutedLight;
    }
  }

  static Color accent(String status) {
    switch (status.toUpperCase()) {
      case 'SUBMITTED':
      case 'RECEIVED':   return CivicColors.statusNew;
      case 'ASSIGNED':
      case 'UNDER_INVESTIGATION': return CivicColors.statusAction;
      case 'IN_PROGRESS': return CivicColors.statusProgress;
      case 'RESOLVED':   return CivicColors.statusSolved;
      case 'CLOSED':     return CivicColors.statusClosed;
      case 'REJECTED':   return CivicColors.statusRejected;
      case 'REOPENED':
      case 'APPEALED':   return CivicColors.statusAppealed;
      default:           return CivicColors.textMuted;
    }
  }

  static String label(String status) =>
      status.replaceAll('_', ' ').split(' ')
          .map((w) => w.isEmpty ? '' : '${w[0].toUpperCase()}${w.substring(1).toLowerCase()}')
          .join(' ');
}

class CivicPriority {
  CivicPriority._();

  static Color color(String priority) {
    switch (priority.toUpperCase()) {
      case 'CRITICAL': return CivicColors.priorityCritical;
      case 'HIGH':     return CivicColors.priorityHigh;
      case 'MEDIUM':   return CivicColors.priorityMedium;
      case 'LOW':      return CivicColors.priorityLow;
      default:         return CivicColors.textMuted;
    }
  }

  static IconData icon(String priority) {
    switch (priority.toUpperCase()) {
      case 'CRITICAL': return Icons.crisis_alert_rounded;
      case 'HIGH':     return Icons.arrow_upward_rounded;
      case 'MEDIUM':   return Icons.remove_rounded;
      case 'LOW':      return Icons.arrow_downward_rounded;
      default:         return Icons.remove_rounded;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED UI COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

/// Status pill badge — used across cards, details, lists
class CivicStatusBadge extends StatelessWidget {
  final String status;
  final double fontSize;

  const CivicStatusBadge(this.status, {super.key, this.fontSize = 11});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: CivicStatus.background(status),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: CivicStatus.accent(status).withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 5, height: 5,
            decoration: BoxDecoration(
              color: CivicStatus.accent(status),
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 5),
          Text(
            CivicStatus.label(status),
            style: CivicText.micro.copyWith(
              fontSize: fontSize,
              color: CivicStatus.foreground(status),
              letterSpacing: 0.02,
            ),
          ),
        ],
      ),
    );
  }
}

/// Priority badge with icon
class CivicPriorityBadge extends StatelessWidget {
  final String priority;

  const CivicPriorityBadge(this.priority, {super.key});

  @override
  Widget build(BuildContext context) {
    final color = CivicPriority.color(priority);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(CivicPriority.icon(priority), size: 11, color: color),
          const SizedBox(width: 4),
          Text(
            priority.toUpperCase(),
            style: CivicText.micro.copyWith(color: color, fontSize: 10),
          ),
        ],
      ),
    );
  }
}

/// SLA countdown badge — green / amber / red
class CivicSlaBadge extends StatelessWidget {
  final double hoursRemaining;
  final bool isBreached;

  const CivicSlaBadge({
    super.key,
    required this.hoursRemaining,
    required this.isBreached,
  });

  @override
  Widget build(BuildContext context) {
    final Color color;
    final IconData icon;
    final String label;

    if (isBreached) {
      color = CivicColors.slaBreached;
      icon = Icons.timer_off_rounded;
      final h = hoursRemaining.abs();
      label = h < 1 ? 'Overdue ${(h * 60).toInt()}m' : 'Overdue ${h.toStringAsFixed(0)}h';
    } else if (hoursRemaining <= 4) {
      color = CivicColors.slaNearing;
      icon = Icons.timer_rounded;
      label = '${hoursRemaining.toStringAsFixed(0)}h left';
    } else {
      color = CivicColors.slaOnTrack;
      icon = Icons.timer_outlined;
      label = '${hoursRemaining.toStringAsFixed(0)}h left';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 11, color: color),
          const SizedBox(width: 4),
          Text(label, style: CivicText.micro.copyWith(color: color, fontSize: 10)),
        ],
      ),
    );
  }
}

/// Primary action button — gradient navy→gov-blue
class CivicPrimaryButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final IconData? icon;
  final double? width;

  const CivicPrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.isLoading = false,
    this.icon,
    this.width,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      height: 48,
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: onPressed != null
              ? const LinearGradient(
                  colors: [CivicColors.govBlue, CivicColors.navyDeep],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                )
              : null,
          color: onPressed == null ? CivicColors.surfaceBorderLight : null,
          borderRadius: BorderRadius.circular(12),
          boxShadow: onPressed != null
              ? [BoxShadow(color: CivicColors.govBlue.withValues(alpha: 0.3), blurRadius: 12, offset: const Offset(0, 4))]
              : null,
        ),
        child: ElevatedButton(
          onPressed: isLoading ? null : onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.transparent,
            shadowColor: Colors.transparent,
            foregroundColor: Colors.white,
            disabledBackgroundColor: Colors.transparent,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            padding: const EdgeInsets.symmetric(horizontal: 20),
          ),
          child: isLoading
              ? const SizedBox(
                  width: 20, height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
                )
              : Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (icon != null) ...[Icon(icon, size: 18), const SizedBox(width: 8)],
                    Text(label, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, letterSpacing: 0.1)),
                  ],
                ),
        ),
      ),
    );
  }
}

/// Outlined secondary button
class CivicOutlinedButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final Color? color;

  const CivicOutlinedButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final c = color ?? CivicColors.govBlue;
    return SizedBox(
      height: 44,
      child: OutlinedButton(
        onPressed: onPressed,
        style: OutlinedButton.styleFrom(
          foregroundColor: c,
          side: BorderSide(color: c.withValues(alpha: 0.5), width: 1.5),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          padding: const EdgeInsets.symmetric(horizontal: 16),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[Icon(icon, size: 16), const SizedBox(width: 6)],
            Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: c)),
          ],
        ),
      ),
    );
  }
}

/// Destructive button (Reject / Delete)
class CivicDestructiveButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;

  const CivicDestructiveButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 44,
      child: ElevatedButton(
        onPressed: isLoading ? null : onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: CivicColors.dangerBg,
          foregroundColor: CivicColors.dangerText,
          elevation: 0,
          side: const BorderSide(color: CivicColors.dangerBorder),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
        child: isLoading
            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
            : Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
      ),
    );
  }
}

/// Info/detail tile row used inside cards
class CivicInfoTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color? iconColor;

  const CivicInfoTile({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
    this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: CivicColors.canvasLight,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: CivicColors.surfaceBorderLight),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Icon(icon, size: 13, color: iconColor ?? CivicColors.textMuted),
            const SizedBox(width: 6),
            Text(label, style: CivicText.micro.copyWith(color: CivicColors.textMuted)),
          ]),
          const SizedBox(height: 6),
          Text(value, style: CivicText.bodyMedium, maxLines: 2, overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }
}

/// Section header with icon — used inside scrollable screens
class CivicSectionHeader extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color? color;

  const CivicSectionHeader({super.key, required this.title, required this.icon, this.color});

  @override
  Widget build(BuildContext context) {
    final c = color ?? CivicColors.govBlue;
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(7),
          decoration: BoxDecoration(color: c.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
          child: Icon(icon, size: 16, color: c),
        ),
        const SizedBox(width: 10),
        Text(title, style: CivicText.h3),
      ],
    );
  }
}

/// Stat summary card — used on dashboard
class CivicStatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const CivicStatCard({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: CivicColors.surfaceLight,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: CivicColors.surfaceBorderLight),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 12, offset: const Offset(0, 2))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, size: 20, color: color),
          ),
          const SizedBox(height: 12),
          Text(value, style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: color, letterSpacing: -0.5)),
          const SizedBox(height: 4),
          Text(label, style: CivicText.label),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// THEME DATA — call CivicTheme.light() inside MaterialApp
// ─────────────────────────────────────────────────────────────────────────────

class CivicTheme {
  CivicTheme._();

  static ThemeData light() {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: CivicColors.govBlue,
        primary: CivicColors.govBlue,
        secondary: CivicColors.forestTeal,
        surface: CivicColors.surfaceLight,
        error: CivicColors.priorityCritical,
      ),

      scaffoldBackgroundColor: CivicColors.canvasLight,

      // AppBar
      appBarTheme: const AppBarTheme(
        backgroundColor: CivicColors.navyDeep,
        foregroundColor: CivicColors.textInverse,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          fontSize: 17, fontWeight: FontWeight.w700,
          color: CivicColors.textInverse, letterSpacing: -0.2,
        ),
        systemOverlayStyle: SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: Brightness.light,
        ),
        iconTheme: IconThemeData(color: CivicColors.textInverse),
      ),

      // Cards
      cardTheme: CardThemeData(
        color: CivicColors.surfaceLight,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(14)),
          side: BorderSide(color: CivicColors.surfaceBorderLight),
        ),
        margin: EdgeInsets.only(bottom: 10),
      ),

      // Input fields
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: CivicColors.surfaceLight,
        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(10)),
          borderSide: BorderSide(color: CivicColors.surfaceBorderLight),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(10)),
          borderSide: BorderSide(color: CivicColors.surfaceBorderLight),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(10)),
          borderSide: BorderSide(color: CivicColors.govBlue, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(10)),
          borderSide: BorderSide(color: CivicColors.priorityCritical),
        ),
        labelStyle: TextStyle(color: CivicColors.textSecondary, fontSize: 14, fontWeight: FontWeight.w500),
        hintStyle: TextStyle(color: CivicColors.textMuted, fontSize: 14),
        floatingLabelStyle: TextStyle(color: CivicColors.govBlue, fontWeight: FontWeight.w600),
      ),

      // Elevated buttons
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: CivicColors.govBlue,
          foregroundColor: Colors.white,
          minimumSize: const Size(0, 48),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          elevation: 0,
          textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
        ),
      ),

      // Outlined buttons
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: CivicColors.govBlue,
          minimumSize: const Size(0, 44),
          side: const BorderSide(color: CivicColors.surfaceBorderLight, width: 1.5),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      ),

      // Text buttons
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: CivicColors.govBlue,
          textStyle: const TextStyle(fontWeight: FontWeight.w600),
        ),
      ),

      // BottomNav
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: CivicColors.surfaceLight,
        selectedItemColor: CivicColors.govBlue,
        unselectedItemColor: CivicColors.textMuted,
        selectedLabelStyle: TextStyle(fontWeight: FontWeight.w700, fontSize: 11),
        unselectedLabelStyle: TextStyle(fontWeight: FontWeight.w500, fontSize: 11),
        type: BottomNavigationBarType.fixed,
        elevation: 0,
      ),

      // Chip
      chipTheme: ChipThemeData(
        backgroundColor: CivicColors.surfaceMutedLight,
        selectedColor: CivicColors.infoBg,
        labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        side: const BorderSide(color: CivicColors.surfaceBorderLight),
      ),

      // Divider
      dividerTheme: const DividerThemeData(
        color: CivicColors.surfaceBorderLight,
        thickness: 1,
        space: 1,
      ),

      // Floating Action Button
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: CivicColors.govBlue,
        foregroundColor: Colors.white,
        shape: CircleBorder(),
        elevation: 4,
      ),

      // SnackBar
      snackBarTheme: SnackBarThemeData(
        backgroundColor: CivicColors.navyDeep,
        contentTextStyle: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        behavior: SnackBarBehavior.floating,
        insetPadding: const EdgeInsets.all(12),
      ),

      // Dialog
      dialogTheme: DialogThemeData(
        backgroundColor: CivicColors.surfaceLight,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        titleTextStyle: CivicText.h2,
        contentTextStyle: CivicText.body,
        elevation: 8,
      ),

      // Text
      textTheme: const TextTheme(
        displayLarge: CivicText.display,
        headlineMedium: CivicText.h2,
        titleLarge: CivicText.h3,
        bodyLarge: CivicText.body,
        bodyMedium: CivicText.bodyMedium,
        labelSmall: CivicText.micro,
      ),
    );
  }
}
