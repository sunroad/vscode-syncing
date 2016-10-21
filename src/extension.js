const vscode = require("vscode");

const Gist = require("./utils/Gist");
const Toast = require("./utils/Toast");
const Config = require("./utils/Config");
const Environment = require("./utils/Environment");

let _env;
let _config;

function activate(p_context)
{
    _initGlobals(p_context);
    _initCommands(p_context);
}

/**
 * init global variables.
 * @param {Object} p_context
 */
function _initGlobals(p_context)
{
    _env = Environment.create(p_context);
    _config = Config.create(p_context);
}

function _initCommands(p_context)
{
    _registerCommand(p_context, "syncing.uploadSettings", _uploadSettings);
    _registerCommand(p_context, "syncing.downloadSettings", _downloadSettings);
    _registerCommand(p_context, "syncing.openSettings", _openSettings);
}

/**
 * registerCommand wrapper.
 */
function _registerCommand(p_context, p_command, p_callback)
{
    p_context.subscriptions.push(vscode.commands.registerCommand(p_command, p_callback));
}

/**
 * upload settings.
 */
function _uploadSettings()
{
    Toast.status("Syncing: gathering local settings...");
    _config.prepareSyncingSettings(false).then((settings) =>
    {
        const api = Gist.create(settings.token, _env.getSyncingProxy());
        _config.getConfigs({ load: true }).then((configs) =>
        {
            Toast.status("Syncing: uploading settings...");
            api.findAndUpdate(settings.id, configs).then((gist) =>
            {
                if (gist.id === settings.id)
                {
                    Toast.statusInfo("Syncing: settings uploaded.");
                }
                else
                {
                    _config.saveSyncingSettings(Object.assign({}, settings, { id: gist.id })).then(() =>
                    {
                        Toast.statusInfo("Syncing: settings uploaded.");
                    });
                }
            }).catch((err) =>
            {
                if (err.code === 401)
                {
                    _config.clearSyncingToken().then(() =>
                    {
                        Toast.statusError(`Syncing: upload failed. ${err.message}`);
                    });
                }
                else
                {
                    Toast.statusError(`Syncing: upload failed. ${err.message}`);
                }
            });
        }).catch((err) =>
        {
            Toast.statusError(`Syncing: upload failed: ${err.message}`);
        });
    }).catch(() =>
    {
        Toast.statusInfo("Syncing: canceled as Github Access Token or Gist ID isn't set.");
    });
}

/**
 * download settings.
 */
function _downloadSettings()
{
    Toast.status("Syncing: checking remote settings...");
    _config.prepareSyncingSettings().then((settings) =>
    {
        const api = Gist.create(settings.token, _env.getSyncingProxy());
        api.get(settings.id).then((gist) =>
        {
            Toast.status("Syncing: downloading settings...");
            _config.saveConfigs(gist.files).then((saved) =>
            {
                // TODO: log saved files.
                Toast.statusInfo("Syncing: settings downloaded.");
            }).catch((err) =>
            {
                Toast.statusError(`Syncing: download failed: ${err.message}`);
            });
        }).catch((err) =>
        {
            if (err.code === 401)
            {
                _config.clearSyncingToken().then(() =>
                {
                    Toast.statusError(`Syncing: download failed. ${err.message}`);
                });
            }
            else
            {
                Toast.statusError(`Syncing: download failed. ${err.message}`);
            }
        });
    }).catch(() =>
    {
        Toast.statusInfo("Syncing: canceled as Github Access Token or Gist ID isn't set.");
    });
}

/**
 * open Syncing's settings.
 */
function _openSettings()
{
    vscode.commands.executeCommand("vscode.open", vscode.Uri.file(_env.syncingSettingPath));
}

module.exports.activate = activate;
