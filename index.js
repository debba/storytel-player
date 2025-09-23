#!/usr/bin/env node

const StorytelTUI = require('./tui');

function main() {
    console.log('Starting Storytel TUI...');

    const app = new StorytelTUI();
    app.start();
}

if (require.main === module) {
    main();
}

module.exports = StorytelTUI;
