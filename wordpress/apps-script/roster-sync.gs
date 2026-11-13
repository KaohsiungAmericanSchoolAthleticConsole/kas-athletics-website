/**
 * KAS Athletics — rosters from this Google Sheet to the website.
 *
 * Setup (once):
 *   1. In the Google Sheet: Extensions → Apps Script, delete what's there, paste this whole file, Save.
 *   2. Reload the sheet. A "KAS website" menu appears.
 *   3. KAS website → Connect to the website (site address, WordPress username, Application Password).
 *   4. KAS website → Set up the Rosters tab (fills it with the website's current rosters).
 *   5. KAS website → Turn on hourly sync (optional).
 *
 * Columns on the "Rosters" tab: Team | Player name | Grad year | Role | Number
 * Every team that has at least one row gets its roster replaced by the sheet's rows.
 */

var SHEET_NAME = 'Rosters';
var HEADERS = ['Team', 'Player name', 'Grad year', 'Role', 'Number'];

function onOpen() {
  SpreadsheetApp.getUi().createMenu('KAS website')
    .addItem('Sync rosters now', 'syncRosters')
    .addSeparator()
    .addItem('Connect to the website', 'connectWebsite')
    .addItem('Set up the Rosters tab', 'setupSheet')
    .addItem('Turn on hourly sync', 'turnOnHourlySync')
    .addItem('Turn off hourly sync', 'turnOffHourlySync')
    .addToUi();
}

/** Asks for the site address and sign-in, and keeps them in this script's private settings. */
function connectWebsite() {
  var ui = SpreadsheetApp.getUi();
  var site = ui.prompt('Website address', 'For example https://kasathletics.wpenginepowered.com', ui.ButtonSet.OK_CANCEL);
  if (site.getSelectedButton() !== ui.Button.OK) return;
  var user = ui.prompt('WordPress username', 'The person whose Application Password you will paste next.', ui.ButtonSet.OK_CANCEL);
  if (user.getSelectedButton() !== ui.Button.OK) return;
  var pass = ui.prompt('Application Password',
    'In WordPress: Users → Profile → Application Passwords → name it "Roster sheet" → Add. Paste it here.',
    ui.ButtonSet.OK_CANCEL);
  if (pass.getSelectedButton() !== ui.Button.OK) return;

  var url = site.getResponseText().trim().replace(/\/+$/, '');
  if (!/^https:\/\//.test(url)) {
    ui.alert('The address must start with https:// so the password is sent safely.');
    return;
  }
  PropertiesService.getScriptProperties().setProperties({
    SITE_URL: url,
    WP_USER: user.getResponseText().trim(),
    WP_APP_PASSWORD: pass.getResponseText().replace(/\s+/g, ''),
  });
  var check = callWebsite_('get', '/teams');
  ui.alert(check.ok ? 'Connected. The website has ' + check.data.length + ' teams.' : 'Could not connect: ' + check.message);
}

/** Creates (or refreshes) the Rosters tab: headers, team dropdown, and the website's current players. */
function setupSheet() {
  var ui = SpreadsheetApp.getUi();
  var teams = callWebsite_('get', '/teams');
  if (!teams.ok) { ui.alert('Could not reach the website: ' + teams.message); return; }

  var book = SpreadsheetApp.getActive();
  var sheet = book.getSheetByName(SHEET_NAME) || book.insertSheet(SHEET_NAME);
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
  sheet.setFrozenRows(1);

  if (sheet.getLastRow() < 2) {
    var current = callWebsite_('get', '/rosters');
    if (current.ok) {
      var rows = [];
      current.data.forEach(function (t) {
        t.players.forEach(function (p) { rows.push([t.team, p.name, p.year, p.role, p.number]); });
      });
      if (rows.length) sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
    }
  }
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(teams.data, true).setAllowInvalid(false)
    .setHelpText('Pick a team from the website.').build();
  sheet.getRange(2, 1, Math.max(sheet.getMaxRows() - 1, 1), 1).setDataValidation(rule);
  sheet.autoResizeColumns(1, HEADERS.length);
  ui.alert('The Rosters tab is ready. Edit players, then use KAS website → Sync rosters now.');
}

/** Menu: sync and show what happened. */
function syncRosters() {
  var result = sync_();
  SpreadsheetApp.getUi().alert(result);
}

/** Hourly trigger: sync without pop-ups. */
function syncRostersQuietly() {
  sync_();
}

function sync_() {
  var sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return 'There is no Rosters tab with players yet. Use KAS website → Set up the Rosters tab.';
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getDisplayValues();
  var byTeam = {};
  values.forEach(function (r) {
    var team = String(r[0]).trim();
    var name = String(r[1]).trim();
    if (!team || !name) return;
    (byTeam[team] = byTeam[team] || []).push({ name: name, year: r[2], role: r[3], number: r[4] });
  });
  var teams = Object.keys(byTeam).map(function (t) { return { team: t, players: byTeam[t] }; });
  if (!teams.length) return 'No players found on the Rosters tab.';

  var res = callWebsite_('post', '/rosters', { teams: teams });
  if (!res.ok) return 'Sync failed: ' + res.message;
  var lines = res.data.updated.map(function (u) { return '✓ ' + u.team + ' (' + u.players + ' players)'; });
  if (res.data.unknownTeams.length) lines.push('', 'Not found on the website (check spelling): ' + res.data.unknownTeams.join(', '));
  SpreadsheetApp.getActive().toast('Rosters synced to the website', 'KAS website', 5);
  return 'Synced ' + res.data.updated.length + ' teams.\n\n' + lines.join('\n');
}

function turnOnHourlySync() {
  turnOffHourlySync();
  ScriptApp.newTrigger('syncRostersQuietly').timeBased().everyHours(1).create();
  SpreadsheetApp.getUi().alert('Rosters will sync to the website every hour.');
}

function turnOffHourlySync() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'syncRostersQuietly') ScriptApp.deleteTrigger(t);
  });
}

/** Calls the website's KAS address. Returns { ok, data } or { ok: false, message }. */
function callWebsite_(method, path, body) {
  var p = PropertiesService.getScriptProperties();
  var site = p.getProperty('SITE_URL');
  if (!site) return { ok: false, message: 'Not connected yet. Use KAS website → Connect to the website.' };
  var options = {
    method: method,
    muteHttpExceptions: true,
    headers: { Authorization: 'Basic ' + Utilities.base64Encode(p.getProperty('WP_USER') + ':' + p.getProperty('WP_APP_PASSWORD')) },
  };
  if (body) { options.contentType = 'application/json'; options.payload = JSON.stringify(body); }
  try {
    var res = UrlFetchApp.fetch(site + '/wp-json/kas/v1' + path, options);
    var data = JSON.parse(res.getContentText() || 'null');
    if (res.getResponseCode() >= 300) {
      var why = data && data.message ? data.message : 'error ' + res.getResponseCode();
      if (res.getResponseCode() === 401) why += ' (check the username and Application Password)';
      return { ok: false, message: why };
    }
    return { ok: true, data: data };
  } catch (e) {
    return { ok: false, message: String(e.message || e) };
  }
}
