# Pre-Deployment Quality Checklist

Before delivering a terminal unit to a customer shop, verify the following steps:

- [ ] **Hardware Boot**: System starts without manual bios alerts.
- [ ] **Node.js Runtime**: Node version 18+ is set as system global path variable.
- [ ] **Offline Database**: Launch server in offline mode; verify products load.
- [ ] **Checkout Logic**: Ring up a sale, select GCash, and verify payment logs.
- [ ] **Senior Discount Exemption**: Check that VAT is zeroed and 20% is subtracted for Senior/PWD checks.
- [ ] **Zadig USB Driver**: Thermal printer prints demo receipt successfully.
- [ ] **Daily Database Backup**: Run the backup script; check that copy is created in backup folder.
