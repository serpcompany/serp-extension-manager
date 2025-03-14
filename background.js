// Opera detector!
function isOpera(){
  // Service workers don't have window, use navigator directly
  var ans = false;
  try {
    // Try to use navigator if available
    if(typeof navigator !== 'undefined') {
      if(navigator.vendor === "Opera Software ASA" || navigator.userAgent.indexOf("OPR/") !== -1) {
        ans = true;
      }
    }
  } catch(e) {
    console.error("Error detecting Opera: ", e);
  }
  return ans;
}

function storeUrl(extID,giveG) {
  var storeURL; var isOpr = isOpera();
  if(!isOpr||giveG) {
    storeURL = "https://chrome.google.com/webstore/detail/" + extID;
  } else if (isOpr&&!giveG) {
    storeURL = "https://addons.opera.com/extensions/details/app_id/" + extID;
  } 
  return storeURL;
}

var defaultSettings = {
  "grpExt" : false,
  "sortMode" : "1",
  "showChk" : true,
  "showSet" : true,
  "showDel" : true,
  "showApp" : true,
  "showThm" : true,
  "showTab" : true,
  "tabPage" : "1",
  "noContext" : false,
  "altBut" : false,
  "showCount" : true,
  "showSearch" : true,
  "showDis" : true,
  "showStore" : false,
  "launchApp" : false,
  "showP" : true,
  "importMode" : "1",
  "searchSave" : true,
  "advGrpVw" : true,
  "rightClickDel" : true,
  "showLat" : false,
  "searchTop" : true,
  "showLD" : false,
  "tabTop" : true,
  "onlyOne" : false,
  "showGrp" : false,
  "theme" : "1"
};

var selfId = chrome.i18n.getMessage("@@extension_id");

// Helper functions for storage
function getStorageData(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => {
      resolve(result);
    });
  });
}

function setStorageData(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, () => {
      resolve();
    });
  });
}

// Returns icon URL of ext of specified size or 0 to get first available
function getIconURL(extInfo, size) {
  if (extInfo.icons) {
    var noOfIco = extInfo.icons.length;
    for (var i = 0; i < noOfIco; i++) {
      var icon = extInfo.icons[i];
      if (size == 0) {
        if (icon.size == 16) {
          return icon.url;
        } else if (icon.size == 48) {
          return icon.url;
        } else if (icon.size == 128) {
          return icon.url;
        }
      } else {
        if (icon.size == size) {
          return icon.url;
        }
      }
    }
  }
  return chrome.runtime.getURL('icon-gen' + size + '.png');
}

//superb sort function from
//http://stackoverflow.com/questions/6913512/how-to-sort-an-array-of-objects-by-multiple-fields
var sort_by;

(function () {
  // utility functions
  var default_cmp = function (a, b) {
    if (a == b)
      return 0;
    return a < b ? -1 : 1;
  },
  getCmpFunc = function (primer, reverse) {
    var dfc = default_cmp, // closer in scope
    cmp = default_cmp;
    if (primer) {
      cmp = function (a, b) {
        return dfc(primer(a), primer(b));
      };
    }
    if (reverse) {
      return function (a, b) {
        return -1 * cmp(a, b);
      };
    }
    return cmp;
  };

  // actual implementation
  sort_by = function () {
    var fields = [],
    n_fields = arguments.length,
    field,
    name,
    reverse,
    cmp;

    // preprocess sorting options
    for (var i = 0; i < n_fields; i++) {
      field = arguments[i];
      if (typeof field === 'string') {
        name = field;
        cmp = default_cmp;
      } else {
        name = field.name;
        cmp = getCmpFunc(field.primer, field.reverse);
      }
      fields.push({
        name : name,
        cmp : cmp
      });
    }

    // final comparison function
    return function (A, B) {
      var a,
      b,
      name,
      result;
      for (var i = 0; i < n_fields; i++) {
        result = 0;
        field = fields[i];
        name = field.name;

        result = field.cmp(A[name], B[name]);
        if (result !== 0)
          break;
      }
      return result;
    };
  };
}());

//detect overlap and with overlapping grp state + activating grp state determine ext state
async function chkGrpOvrlap(extId, grpFrom, fromState) {
  var finalState = false;
  if (!fromState) {
    const storageData = await getStorageData(["GRPindex"]);
    const GRPindex = storageData.GRPindex || [];
    
    for (var i = 0, len = GRPindex.length; i < len; i++) {
      const grpData = await getStorageData([`GRP-${GRPindex[i]}`]);
      const extGrpObj = grpData[`GRP-${GRPindex[i]}`];
      if (!extGrpObj) continue;
      
      var grpState = extGrpObj.enabled;
      var grpName = extGrpObj.name;
      var grpItems = extGrpObj.items;
      
      if (grpName != grpFrom) {
        if(grpItems.indexOf(extId) > -1) {
          if (grpState) {
            finalState = true;
            return finalState;
          }
        }
      }
    }
  }
  return finalState;
}

function spliceSelf(extGrpObj){
  var grpItems = extGrpObj.items;
  for (var k = 0, s = grpItems.length; k < s; k++) {
    if (grpItems[k] == selfId) {
      grpItems.splice(k,1);
    }
  }
  return extGrpObj;
}

function isInstalled(extList, extIdToChk){
  var found = false;
  var foundObj = null;
  for(var j = 0, len = extList.length; j < len; j++){
    if(extList[j].id == extIdToChk) {found = true; foundObj = extList[j]; break;}
  }
  return [found, foundObj];
}

//returns array of enabled & of true grp size
function getEnabledCount(grp, extList) {
  var enabledCount = 0;
  var gItems = grp.items;
  var unfound = 0;

  for (var w = 0, len = gItems.length; w < len; w++) {
    var found = isInstalled(extList,gItems[w]);
    if(found[0]&&found[1].enabled){enabledCount++;}
    if(!found[0]){unfound++;}
  }
  var realSize = gItems.length - unfound;
  return [enabledCount,realSize];
}

//toggle enable/disable
async function enableGrp(grpName, importing, force, context) {
  if(force === undefined) force = false;
  if(context === undefined) context = false;
  
  chrome.management.getAll(async function (extList) {
    const storageData = await getStorageData(["settings", `GRP-${grpName}`]);
    const settings = storageData.settings || defaultSettings;
    const extGrpObj = storageData[`GRP-${grpName}`];
    
    if(!extGrpObj) return;
    
    if(!settings.onlyOne || force){
      var grpState = extGrpObj.enabled;
      var grpItems = extGrpObj.items;

      if (!importing) {
        grpState = !grpState;
      }

      for (var i = 0, s = grpItems.length; i < s; i++) {
        if (grpItems[i] != selfId) {
          var found = isInstalled(extList, grpItems[i]);
          if(found[0]){
            chrome.management.setEnabled(grpItems[i], grpState);
            if(context) await setGrpStateOnly();
          }
        }
      }  
    } else {
      await disableAllExcept(grpName, context);
    }
  });
}

//hard disable
async function disableGrp(grpName, context) {
  if(context === undefined) context = false;
  
  chrome.management.getAll(async function (extList) {
    const storageData = await getStorageData(["settings", `GRP-${grpName}`]);
    const settings = storageData.settings || defaultSettings;
    const extGrpObj = storageData[`GRP-${grpName}`];
    
    if(!extGrpObj) return;
    
    var grpItems = extGrpObj.items;

    for (var i = 0, s = grpItems.length; i < s; i++) {
      if (grpItems[i] != selfId) {
        var found = isInstalled(extList, grpItems[i]);
        if(found[0]){
          chrome.management.setEnabled(grpItems[i], false);
          if(context) await setGrpStateOnly();
        }
      }
    }
  });
}

async function disableAllExcept(grpName, context){
  const storageData = await getStorageData(["GRPindex"]);
  const GRPindex = storageData.GRPindex || [];
  
  for (var i = 0, k = GRPindex.length; i < k; i++){
    await disableGrp(GRPindex[i], context);
  }
  await enableGrp(grpName, false, true, context);
}

async function setGrpStateOnly() {
  chrome.management.getAll(async function(extList) {
    const storageData = await getStorageData(["GRPindex"]);
    const GRPindex = storageData.GRPindex || [];
    
    for (var i = 0, k = GRPindex.length; i < k; i++){
      const grpData = await getStorageData([`GRP-${GRPindex[i]}`]);
      var grp = grpData[`GRP-${GRPindex[i]}`];
      
      if (!grp) continue;
      
      var counts = getEnabledCount(grp, extList);
      
      if(counts[0] != counts[1] || counts[1] == 0) {
        grp.enabled = false;
      } else {
        grp.enabled = true;
      }
      
      await setStorageData({ [`GRP-${GRPindex[i]}`]: grp });
      chrome.contextMenus.update(grp.id, {"checked": grp.enabled});
    }  
  });
}

async function addGrp(grpObj, GRPindex, fromOptions, mode, oldName){
  sortGrpItems(grpObj.items, async function(sortedItems){
    grpObj.items = sortedItems;
    
    await setStorageData({ [`GRP-${grpObj.id}`]: grpObj });
    
    if(GRPindex.indexOf(grpObj.id) == -1 && mode !== 1) {
      GRPindex.push(grpObj.id);
      await setStorageData({ "GRPindex": GRPindex });
    }
    
    if(mode == 1){
      var index = GRPindex.indexOf(oldName);
      if (index !== -1) {
        GRPindex[index] = grpObj.id;
      }
      await setStorageData({ "GRPindex": GRPindex });
    }
    
    await menuCreate();
  });
}

async function removeGrp(grpId, editOnly){
  const storageData = await getStorageData(["GRPindex"]);
  const GRPindex = storageData.GRPindex || [];
  
  await chrome.storage.local.remove([`GRP-${grpId}`]);
  
  if(editOnly != 1){
    const index = GRPindex.indexOf(grpId);
    if (index > -1) {
      GRPindex.splice(index, 1);
      await setStorageData({ "GRPindex": GRPindex });
    }
  }
}

function sortGrpItems(itmArr, callback){
  chrome.management.getAll(function (extList) {
    getStorageData(["settings"]).then(storageData => {
      const settings = storageData.settings || defaultSettings;
      var objArr = [];
      var sortedIdArr = [];
      
      for(var i = 0, j = itmArr.length; i < j; i++){
        var found = isInstalled(extList, itmArr[i]);
        if(found[0]){objArr.push(found[1]);}
        else{objArr.push(notInstalledObj(itmArr[i]));}
      }
          
      objArr.sort(sort_by({name:'name',primer:function(a){return a.toUpperCase();},reverse:false}));
      
      for(var k = 0, b = objArr.length; k < b; k++){
        sortedIdArr.push(objArr[k].id);
      }
      
      callback(sortedIdArr);
    });
  });
}

async function menuCreate() {
  const storageData = await getStorageData(["settings", "GRPindex"]);
  const settings = storageData.settings || defaultSettings;
  const GRPindex = storageData.GRPindex || [];
  
  chrome.contextMenus.removeAll();
  
  if (!settings.noContext) {
    for (var i = 0, k = GRPindex.length; i < k; i++) {
      const grpData = await getStorageData([`GRP-${GRPindex[i]}`]);
      const extGrpObj = grpData[`GRP-${GRPindex[i]}`];
      
      if (extGrpObj) {
        chrome.contextMenus.create({
          "title": extGrpObj.name,
          "type": "checkbox",
          "contexts": ['page', 'action'],
          "id": extGrpObj.id,
          "checked": extGrpObj.enabled
        });
      }
    }
  }
}

async function updateIcon() {
  const storageData = await getStorageData(["settings"]);
  const settings = storageData.settings || defaultSettings;
  
  if (settings.altBut) {
    chrome.action.setIcon({
      path: {
        "19": "icon-19-1.png",
        "38": "icon-38-1.png"
      }
    });
  } else {
    // Service workers can't access window.matchMedia
    // Use a system-appropriate default icon
    chrome.action.setIcon({
      path: {
        "19": "icon-19-0.png",
        "38": "icon-38-0.png"
      }
    });
    
    // Let's use the Chrome API to detect the dark mode if available
    try {
      if (chrome.devtools && chrome.devtools.panels && chrome.devtools.panels.themeName === 'dark') {
        chrome.action.setIcon({
          path: {
            "19": "icon-19-2.png",
            "38": "icon-38-2.png"
          }
        });
      }
    } catch (e) {
      console.log("Dark mode detection not available in service worker");
    }
  }
}

async function weedQ(qName, extID){
  const storageData = await getStorageData([qName]);
  var queue = storageData[qName] || [];
  
  var index = queue.indexOf(extID);
  if (index > -1) {
    queue.splice(index, 1);
    await setStorageData({ [qName]: queue });
  }
}

function notInstalledObj(extId){
  return {
    id: extId,
    type: "not_installed",
    name: chrome.i18n.getMessage("det_notInst"),
    homepageUrl: storeUrl(extId)
  };
}

async function initialize(){
  await setStorageData({
    "settings": defaultSettings,
    "latest": [],
    "lastDisabled": [],
    "GRPindex": [],
    "updatedTill": chrome.runtime.getManifest().version
  });
}

async function settingsUpdate(){
  const storageData = await getStorageData(["settings", "updatedTill"]);
  
  if(!storageData.settings) {
    await initialize();
    return;
  }
  
  if(storageData.settings && (!storageData.updatedTill || await needUpdateOrNot("1.4.10"))){
    if(Object.keys(storageData.settings).length != Object.keys(defaultSettings).length){
      console.log("Updating settings...");
      var localKeys = Object.keys(storageData.settings).sort();
      var currDefKeys = Object.keys(defaultSettings).sort();
      var settings = storageData.settings;
      
      for(var i = 0; i < currDefKeys.length; i++){
        var found = false;
        for(var j = 0; j < localKeys.length; j++){
          if(currDefKeys[i] === localKeys[j]) {
            found = true;
            break;
          }
        }
        if(!found) {
          settings[currDefKeys[i]] = defaultSettings[currDefKeys[i]];
        }
      }
      
      await setStorageData({ "settings": settings });
    }
    
    //for accordion, 1.4.8
    const grpIndexData = await getStorageData(["GRPindex"]);
    const GRPindex = grpIndexData.GRPindex || [];
    
    for(var i = 0, j = GRPindex.length; i < j; i++) {
      const grpData = await getStorageData([`GRP-${GRPindex[i]}`]);
      let extGrpObj = grpData[`GRP-${GRPindex[i]}`];
      
      if (extGrpObj) {
        extGrpObj.expand = true;
        await setStorageData({ [`GRP-${GRPindex[i]}`]: extGrpObj });
      }
    }
    
    await duplRecents(); //remove duplicates in recents
    
    await setStorageData({ "updatedTill": chrome.runtime.getManifest().version });
  }
}

async function duplRecents(){
  const storageData = await getStorageData(["latest"]);
  var exIdList = storageData.latest || [];
  
  for (var i = 0, len = exIdList.length; i < len; i++) {
    for(var j = i+1, leng = exIdList.length; j < leng; j++){
      if(exIdList[i] === exIdList[j]){
        exIdList.splice(j, 1);
        j--;
        leng--;
      }
    }
  }
  
  await setStorageData({ "latest": exIdList });
}

async function removeSelfFromGrps(){
  const storageData = await getStorageData(["GRPindex"]);
  const GRPindex = storageData.GRPindex || [];
  
  for (var i = 0, len = GRPindex.length; i < len; i++){
    const grpData = await getStorageData([`GRP-${GRPindex[i]}`]);
    let extGrpObj = grpData[`GRP-${GRPindex[i]}`];
    
    if (extGrpObj) {
      extGrpObj = spliceSelf(extGrpObj);
      await setStorageData({ [`GRP-${GRPindex[i]}`]: extGrpObj });
    }
  }
}

async function grpWeeder(extId){
  const storageData = await getStorageData(["GRPindex"]);
  const GRPindex = storageData.GRPindex || [];
  let updatedGRPindex = [...GRPindex];
  
  for (var i = 0, len = updatedGRPindex.length; i < len; i++) {
    const grpData = await getStorageData([`GRP-${updatedGRPindex[i]}`]);
    let extGrpObj = grpData[`GRP-${updatedGRPindex[i]}`];
    
    if (!extGrpObj) continue;
    
    let grpItems = extGrpObj.items;
    let toResave = false;
    
    let index = grpItems.indexOf(extId);
    if (index > -1) {
      toResave = true;
      grpItems.splice(index, 1);
    }
    
    if(toResave){
      let grpName = extGrpObj.name;
      if(grpItems.length != 0){
        let grpObj = {
          "name": grpName,
          "id": grpName,
          "type": "extGrp",
          "enabled": extGrpObj.enabled,
          "items": grpItems
        };
        await setStorageData({ [`GRP-${grpName}`]: grpObj });
      } else {
        await removeGrp(grpName);
        updatedGRPindex.splice(i, 1);
        i--;
        len--;
      }
    }
  }
  
  if (JSON.stringify(updatedGRPindex) !== JSON.stringify(GRPindex)) {
    await setStorageData({ "GRPindex": updatedGRPindex });
  }
}

async function addToQ(qName, extID){
  const storageData = await getStorageData([qName]);
  let queue = storageData[qName] || [];
  
  if(queue.indexOf(extID) != -1) {
    queue.splice(queue.indexOf(extID), 1);
  }
  
  queue.unshift(extID);
  if(queue.length > 5) queue.pop();
  
  await setStorageData({ [qName]: queue });
}

// disable stuff not compatible with Opera
async function ifOpera() {
  if(isOpera()) { 
    const storageData = await getStorageData(["settings"]);
    let settings = storageData.settings || defaultSettings;
    
    settings.showApp = false;
    settings.showThm = false;
    
    await setStorageData({ "settings": settings });
  }
}

//compare updatedTill with specified version, if greater true
async function needUpdateOrNot(specVer){
  const storageData = await getStorageData(["updatedTill"]);
  
  let need = false;
  if(!storageData.updatedTill){
    need = true;
  } else if(storageData.updatedTill && specVer !== "skip"){
    if(storageData.updatedTill !== specVer){
      const spcVer = specVer.split(".").map(Number);
      const tillVer = storageData.updatedTill.split(".").map(Number);
      const len = Math.max(spcVer.length, tillVer.length);
      
      for(var i = 0; i < len; i++){
        if(spcVer[i] === undefined){spcVer[i] = 0;}
        if(tillVer[i] === undefined){tillVer[i] = 0;}
        if(spcVer[i] > tillVer[i]){
          need = true; 
          break;
        } 
      }
    }  
  }
  return need;
}

function contextHandler(info, tab) {
  const grpName = info.menuItemId;
  enableGrp(grpName, false, false, true);
}

// Set up the extension when installed
chrome.runtime.onInstalled.addListener(async function(details) {
  if (details.reason === "install") {
    await initialize();
  }
});

// Service worker event listeners
settingsUpdate().then(() => {
  chrome.runtime.onInstalled.addListener(function(runInfo) {
    if (runInfo.reason == "install") {
      initialize();
    }
    if (runInfo.reason == "update") {
      settingsUpdate().then(() => {
        removeSelfFromGrps();
      });
    }
    ifOpera();
    updateIcon();
    menuCreate();
  });
});

chrome.management.onInstalled.addListener(function(extInfo){
  if(extInfo.installType != "development") addToQ('latest', extInfo.id);
});

chrome.management.onUninstalled.addListener(function(extId){
  grpWeeder(extId);
  weedQ('latest', extId);
  weedQ('lastDisabled', extId);
});

chrome.management.onDisabled.addListener(function(extInfo){
  addToQ('lastDisabled', extInfo.id);
});

chrome.management.onEnabled.addListener(function(extInfo){
  weedQ('lastDisabled', extInfo.id);
});

chrome.contextMenus.onClicked.addListener(contextHandler);

// Remove the window.matchMedia listener since it's not available in service workers
// We'll handle theme changes using theme installed/updated events
chrome.management.onInstalled.addListener(function(extInfo) {
  if (extInfo.type === "theme") {
    updateIcon();
  }
});

// Run updateIcon periodically to account for system theme changes
chrome.alarms.create('updateIcon', { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener(function(alarm) {
  if (alarm.name === 'updateIcon') {
    updateIcon();
  }
});