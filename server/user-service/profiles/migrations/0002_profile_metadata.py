# Generated manually for profile metadata and picture storage fields.

import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("profiles", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="profile_picture_key",
            field=models.CharField(blank=True, max_length=512),
        ),
        migrations.AddField(
            model_name="profile",
            name="profile_picture_content_type",
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name="profile",
            name="profile_picture_size",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="profile",
            name="biography",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="profile",
            name="timezone",
            field=models.CharField(blank=True, max_length=64),
        ),
        migrations.AddField(
            model_name="profile",
            name="language",
            field=models.CharField(blank=True, max_length=16),
        ),
        migrations.AddField(
            model_name="profile",
            name="preferences",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="profile",
            name="updated_at",
            field=models.DateTimeField(default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name="profile",
            name="updated_at",
            field=models.DateTimeField(auto_now=True),
        ),
    ]
