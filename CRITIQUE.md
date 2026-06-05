# POS System Redesign Critique

Below are the 5 specific problems identified in the existing universal POS system codebase that make it "poorly designed and confusing to use":

## 1. Developer-Centric Folder Structure
The naming of the root directories `/server` and `/client` is developer jargon. For non-technical users, shop owners, or junior maintainers, this causes immediate cognitive load. Renaming these folders to `/backend` and `/frontend` aligns with standard layman vocabulary and clarifies the roles of the sub-projects.

## 2. Fragile and Complex Printer Detection
The printer detection and receipt generation system is deeply coupled with the server's checkout cycle. It attempts dynamic runtime USB/serial auto-detection upon each print job, meaning that if a printer is disconnected or errors out, the checkout process crashes or blocks. There is no simple setup wizard where a user can choose their thermal/impact connection, run a test print, and set it as the default. Additionally, there is no offline print-job queue that buffers receipts to disk (`pending_prints.json`) to retry printing when the hardware recovers.

## 3. Code-Heavy Plugin system
The plugin loader (`PluginLoader.js`) loads Javascript hook modules from the `/server/plugins` folder dynamically. To switch or tweak a business type (e.g. Water Station vs Laundry vs Motor Repair), a user is forced to write/modify Javascript code. A non-technical shop owner cannot configure custom receipt headers, units of measure, or transaction fields without hireable developers. It should be transitioned into a flat, readable JSON configuration system where business properties are driven by plain config files.

## 4. Complex Setup & Multi-Console Start-up
The installation and launching workflow requires manual terminal navigation, configuring environment variables, running database seeds separately, and having multiple command prompt windows open simultaneously (`npm start` and `npm run dev` in separate consoles). This increases the chances of port clashes, path resolution errors, and visual noise. We need single-command scripts (`install.bat` and `start.bat`) that hide complexity and launch everything seamlessly.

## 5. Cluttered Cashier View
The current frontend UI layout blends cashier operations, admin settings, transaction lists, and reporting on the same dashboard without clear user segmentation. Cashiers can easily misclick administrative functions or edit product catalogs. The design lacks a touch-friendly, single-screen cashier panel with large interactive product buttons, a dedicated payment calculator modal, and simple PIN verification (e.g., `1234`) to access management settings.
