# BDUI Notification Icons

This directory contains custom icons used for native desktop notifications.

## Icons

### completed.png
- **Size**: 512x512 PNG
- **Design**: Green circle with white checkmark
- **Usage**: Shown when a task is completed (status changes to "closed")
- **Color**: #00C853 (Material Design Green 600)

### blocked.png
- **Size**: 512x512 PNG
- **Design**: Red circle with white prohibition symbol
- **Usage**: Shown when a task becomes blocked
- **Color**: #D32F2F (Material Design Red 700)

## Platform Support

These icons are used by `node-notifier` with platform-specific implementations:

- **macOS**: Uses `contentImage` and `appIcon` for optimal display in Notification Center
- **Linux**: Uses `icon` parameter with freedesktop.org notification spec
- **Windows**: Uses `icon` parameter for toast notifications

## Regenerating Icons

If you need to recreate the icons, run:

```bash
cd assets/icons
./create-icon.sh
```

This requires ImageMagick (`magick` or `convert` command).

## Customization

To customize the icons:

1. Edit the `create-icon.sh` script
2. Adjust colors, sizes, or designs
3. Re-run the script to generate new icons
4. Icons are automatically discovered by the notification system

The notification system includes fallback logic, so if icons are missing, notifications will still work (just without custom icons).
