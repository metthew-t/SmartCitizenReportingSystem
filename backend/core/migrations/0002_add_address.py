from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('core', '__first__'),
    ]

    operations = [
        migrations.AddField(
            model_name='report',
            name='aanaa',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='report',
            name='iddoo_addaa',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='report',
            name='kuta_magaalaa',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
    ]
