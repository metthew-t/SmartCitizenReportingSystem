from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Adds whatsapp_callmebot_apikey field for CallMeBot WhatsApp integration.
    Uses IF NOT EXISTS ALTER so it's safe on existing Render DB.
    """

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="""
                    ALTER TABLE accounts_user ADD COLUMN IF NOT EXISTS whatsapp_callmebot_apikey VARCHAR(100);
                    """,
                    reverse_sql=migrations.RunSQL.noop,
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name='user',
                    name='whatsapp_callmebot_apikey',
                    field=models.CharField(blank=True, max_length=100, null=True),
                ),
            ],
        ),
    ]

