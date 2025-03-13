//window.addEventListener("load", bgOnLoad);
settingsUpdate();

chrome.runtime.onInstalled.addListener(function(runInfo) {
	if (runInfo.reason == "install") {
		initialize();
	}
	if (runInfo.reason == "update") {
		settingsUpdate();
		removeSelfFromGrps(); //remove after 1.4.3.11
	}
	ifOpera();
	updateIcon();
	menuCreate();
});

chrome.runtime.onStartup.addListener(bgOnLoad);

chrome.management.onInstalled.addListener(function(extInfo){
	if(extInfo.installType!="development") addToQ('latest',extInfo.id);
});
chrome.management.onUninstalled.addListener(function(extId){
	grpWeeder(extId);
	weedQ('latest',extId);
	weedQ('lastDisabled',extId);
});

chrome.management.onDisabled.addListener(function(extInfo){
	addToQ('lastDisabled',extInfo.id);
});
chrome.management.onEnabled.addListener(function(extInfo){
	weedQ('lastDisabled',extInfo.id);
});

function initialize(){
	localStorage.settings = JSON.stringify(defaultSettings);
	localStorage.setItem("latest",JSON.stringify([]));
	localStorage.setItem("lastDisabled",JSON.stringify([]));
	localStorage.setItem("GRPindex",JSON.stringify([]));
	localStorage.updatedTill = chrome.runtime.getManifest().version;
}

function bgOnLoad(){
	// console.log("SEM Loaded");
	if(localStorage.getItem('settings')!==null)updateIcon();
}

/*preserve old settings while adding new one*/
function settingsUpdate(){
	if(localStorage.settings === undefined){ initialize();}
	if(localStorage.settings !== undefined&&(localStorage.updatedTill === undefined||needUpdateOrNot("1.4.10"))){
		if(Object.keys(JSON.parse(localStorage.settings)).length != Object.keys(defaultSettings).length){
			console.log("Updating settings...");
			var localKeys = Object.keys(JSON.parse(localStorage.settings)).sort();
			var currDefKeys = Object.keys(defaultSettings).sort();
			var settings = JSON.parse(localStorage.settings);
			for(var i=0; i < currDefKeys.length; i++){
				var found = false;
				for(var j=0; j < localKeys.length; j++){
					if(currDefKeys[i] === localKeys[j]) {found = true; break;}
				}
				if(!found) {settings[currDefKeys[i]] = defaultSettings[currDefKeys[i]];}
			}
			localStorage.settings = JSON.stringify(settings);
		}
		
		//for accordion, 1.4.8
		var GRPindex = JSON.parse(localStorage.GRPindex);
		for(var i=0, j=GRPindex.length; i<j; i++) {
		  var extGrpObj = JSON.parse(localStorage["GRP-"+GRPindex[i]]);
		  extGrpObj.expand = true;
		  localStorage["GRP-"+GRPindex[i]] = JSON.stringify(extGrpObj);
		}
		
		duplRecents(); //remove duplicates in recents
		
		localStorage.updatedTill = chrome.runtime.getManifest().version;
	}
}

function duplRecents(){
	var exIdList = JSON.parse(localStorage.getItem('latest'));
	for (var i = 0, len = exIdList.length; i < len; i++) {
		for(var j = i+1, leng = exIdList.length; j < leng; j++){
			if(exIdList[i]===exIdList[j]){exIdList.splice(j,1);}
		}
	}
	localStorage.latest = JSON.stringify(exIdList);
}

function indexGrps(){
	var index = JSON.parse(localStorage.GRPindex);
	for (var i = 0, len = localStorage.length; i < len; i++) {
		if (localStorage.key(i).substring(0, 4) == "GRP-") {
			var extGrpObj = JSON.parse(localStorage[localStorage.key(i)]);
			index.push(extGrpObj.name);
		}
	}
	localStorage.setItem("GRPindex",JSON.stringify(index)); 
}

function removeSelfFromGrps(){
	var GRPindex = JSON.parse(localStorage.GRPindex);
	for (var i = 0, len = GRPindex.length; i < len; i++){
		var extGrpObj = JSON.parse(localStorage["GRP-" + GRPindex[i]]);
		localStorage["GRP-"+GRPindex[i]] = JSON.stringify(spliceSelf(extGrpObj));
	}
}

function grpWeeder(extId){
	var GRPindex = JSON.parse(localStorage.GRPindex);
	for (var i = 0, len = GRPindex.length; i < len; i++) {
		var extGrpObj = JSON.parse(localStorage["GRP-"+GRPindex[i]]);
		var grpItems = extGrpObj.items;

		var toResave = false;
		
		var index = grpItems.indexOf(extId);
		if (index > -1) {
			toResave = true;
			grpItems.splice(index, 1);
		}
		
		if(toResave){
			var grpName = extGrpObj.name;
			if(grpItems.length!=0){
				var grpObj = {"name":grpName,"id":grpName,"type":"extGrp","enabled":extGrpObj.enabled,"items":grpItems};
				localStorage["GRP-"+grpName] = JSON.stringify(grpObj);
			}else{
				removeGrp(grpName);
				--i; --len;
			}
		}
	}
}

function addToQ(qName,extID){
	var queue = JSON.parse(localStorage.getItem(qName));
	if(queue.indexOf(extID)!=-1) {queue.splice(queue.indexOf(extID),1);}
	queue.unshift(extID);
	if(queue.length>5) queue.pop();
	localStorage.setItem(qName,JSON.stringify(queue));
}

// disable stuff not compatible with Opera
function ifOpera() {
	if(isOpera()) { 
		var settings = JSON.parse(localStorage.settings);
		settings.showApp = false;
		settings.showThm = false;
		localStorage.settings = JSON.stringify(settings);
	}
}

//compare updatedTill with specified version, if greater true
function needUpdateOrNot(specVer){
	var need = false;
	if(localStorage.updatedTill === undefined){need = true;}
	else if(localStorage.updatedTill !== undefined && specVer !== "skip"){
		if(localStorage.updatedTill !== specVer){
			var spcVer = specVer.split(".").map(Number);
			var tillVer = localStorage.updatedTill.split(".").map(Number);
			var len = Math.max(spcVer.length, tillVer.length);
			for(var i = 0; i<len; i++){
				if(spcVer[i]===undefined){spcVer[i]=0;}
				if(tillVer[i]===undefined){tillVer[i]=0;}
				if(spcVer[i]>tillVer[i]){need = true; break;} 
			}
		}	
	}
	return need;
}

function contextHandler(info, tab) {
	var grpName = info.menuItemId;
	enableGrp(grpName,false,false,true);
}

chrome.contextMenus.onClicked.addListener(contextHandler);