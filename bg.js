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
	// Initialize with default settings
	localStorage.settings = JSON.stringify(defaultSettings);
	localStorage.setItem("latest",JSON.stringify([]));
	localStorage.setItem("lastDisabled",JSON.stringify([]));
	localStorage.setItem("GRPindex",JSON.stringify([]));
	localStorage.updatedTill = chrome.runtime.getManifest().version;
	
	// Ensure critical settings are set correctly
	var settings = JSON.parse(localStorage.settings);
	settings.showChk = true;     // Make sure checkboxes are shown
	settings.tabPage = "1";      // Start on Extensions tab, not Groups
	settings.grpExt = false;     // Don't group by category
	settings.searchTop = true;   // Search bar on top
	settings.showTab = true;     // Show tabs
	localStorage.settings = JSON.stringify(settings);
	
	// Don't create default groups
	// createDefaultGroups();
}

function createDefaultGroups() {
	// Get all extensions
	chrome.management.getAll(function(extensions) {
		var GRPindex = [];
		
		// Create Productivity group
		var productivityGroup = {
			"name": "Productivity",
			"id": "Productivity",
			"type": "extGrp",
			"enabled": true,
			"items": [],
			"expand": true
		};
		
		// Create Social Media group
		var socialGroup = {
			"name": "Social Media",
			"id": "Social Media",
			"type": "extGrp",
			"enabled": true,
			"items": [],
			"expand": true
		};
		
		// Create Development group
		var devGroup = {
			"name": "Development",
			"id": "Development",
			"type": "extGrp",
			"enabled": true,
			"items": [],
			"expand": true
		};
		
		// Create a general "All Extensions" group
		var allExtGroup = {
			"name": "All Extensions",
			"id": "All Extensions",
			"type": "extGrp",
			"enabled": true,
			"items": [],
			"expand": true
		};
		
		// Add extensions to groups based on keywords in their names or descriptions
		for (var i = 0; i < extensions.length; i++) {
			var ext = extensions[i];
			if (ext.id === selfId || ext.type !== "extension") continue; // Skip this extension and non-extensions
			
			// Add to All Extensions group
			allExtGroup.items.push(ext.id);
			
			var name = ext.name ? ext.name.toLowerCase() : "";
			var description = ext.description ? ext.description.toLowerCase() : "";
			
			// Keywords for productivity tools
			if (name.includes("docs") || name.includes("office") || 
				name.includes("note") || name.includes("calendar") || 
				name.includes("task") || name.includes("work") ||
				name.includes("productivity") || name.includes("mail") ||
				description.includes("productivity") || name.includes("drive")) {
				productivityGroup.items.push(ext.id);
			}
			// Keywords for social media tools
			else if (name.includes("facebook") || name.includes("twitter") || 
				name.includes("instagram") || name.includes("linkedin") || 
				name.includes("social") || name.includes("chat") ||
				name.includes("messenger") || name.includes("whatsapp") ||
				description.includes("social media")) {
				socialGroup.items.push(ext.id);
			}
			// Keywords for development tools
			else if (name.includes("dev") || name.includes("code") || 
				name.includes("web") || name.includes("git") || 
				name.includes("debug") || name.includes("inspect") ||
				description.includes("developer") || description.includes("coding")) {
				devGroup.items.push(ext.id);
			}
		}
		
		// Tracking the number of groups to process
		var groupsToProcess = 0;
		var groupsProcessed = 0;
		
		// Function to call when all groups are processed
		function finalizeGroups() {
			// Save the index of groups
			if (GRPindex.length > 0) {
				localStorage.GRPindex = JSON.stringify(GRPindex);
				
				// Set extension to show groups tab by default
				var settings = JSON.parse(localStorage.settings);
				settings.tabPage = "2"; // Switch to groups tab
				localStorage.settings = JSON.stringify(settings);
				
				// Create context menus for groups
				menuCreate();
			}
		}
		
		// Function to check when all groups are processed
		function checkAllGroupsProcessed() {
			groupsProcessed++;
			if (groupsProcessed >= groupsToProcess) {
				finalizeGroups();
			}
		}
		
		// Process the All Extensions group first (this will be our fallback)
		if (allExtGroup.items.length > 0) {
			groupsToProcess++;
			sortGrpItems(allExtGroup.items, function(sortedItems) {
				allExtGroup.items = sortedItems;
				localStorage["GRP-All Extensions"] = JSON.stringify(allExtGroup);
				GRPindex.push("All Extensions");
				checkAllGroupsProcessed();
			});
		}
		
		// Process other groups only if they have items
		if (productivityGroup.items.length > 0) {
			groupsToProcess++;
			sortGrpItems(productivityGroup.items, function(sortedItems) {
				productivityGroup.items = sortedItems;
				localStorage["GRP-Productivity"] = JSON.stringify(productivityGroup);
				GRPindex.push("Productivity");
				checkAllGroupsProcessed();
			});
		}
		
		if (socialGroup.items.length > 0) {
			groupsToProcess++;
			sortGrpItems(socialGroup.items, function(sortedItems) {
				socialGroup.items = sortedItems;
				localStorage["GRP-Social Media"] = JSON.stringify(socialGroup);
				GRPindex.push("Social Media");
				checkAllGroupsProcessed();
			});
		}
		
		if (devGroup.items.length > 0) {
			groupsToProcess++;
			sortGrpItems(devGroup.items, function(sortedItems) {
				devGroup.items = sortedItems;
				localStorage["GRP-Development"] = JSON.stringify(devGroup);
				GRPindex.push("Development");
				checkAllGroupsProcessed();
			});
		}
		
		// If no groups were added for processing, finalize immediately
		if (groupsToProcess === 0) {
			finalizeGroups();
		}
	});
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
		var GRPindex = [];
		try {
			if (localStorage.GRPindex) {
				GRPindex = JSON.parse(localStorage.GRPindex);
			} else {
				// Initialize if needed
				localStorage.setItem("GRPindex", JSON.stringify([]));
			}
		} catch (e) {
			console.log("Error parsing GRPindex for accordion: " + e.message);
			// Reset with empty array if corrupted
			localStorage.setItem("GRPindex", JSON.stringify([]));
		}
		
		for(var i=0, j=GRPindex.length; i<j; i++) {
			try {
				var grpKey = "GRP-"+GRPindex[i];
				if (!localStorage[grpKey]) {
					continue; // Skip if group data doesn't exist
				}
				var extGrpObj = JSON.parse(localStorage[grpKey]);
				extGrpObj.expand = true;
				localStorage[grpKey] = JSON.stringify(extGrpObj);
			} catch (e) {
				console.log("Error processing group for accordion: " + e.message);
			}
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
	var index = [];
	try {
		if (localStorage.GRPindex) {
			index = JSON.parse(localStorage.GRPindex);
		}
	} catch (e) {
		console.log("Error parsing GRPindex in indexGrps: " + e.message);
	}
	
	for (var i = 0, len = localStorage.length; i < len; i++) {
		try {
			if (localStorage.key(i) && localStorage.key(i).substring(0, 4) == "GRP-") {
				var extGrpObj = JSON.parse(localStorage[localStorage.key(i)]);
				if (extGrpObj && extGrpObj.name) {
					index.push(extGrpObj.name);
				}
			}
		} catch (e) {
			console.log("Error processing group in indexGrps: " + e.message);
		}
	}
	localStorage.setItem("GRPindex", JSON.stringify(index)); 
}

function removeSelfFromGrps(){
	var GRPindex = [];
	try {
		if (localStorage.GRPindex) {
			GRPindex = JSON.parse(localStorage.GRPindex);
		} else {
			return; // Nothing to do if no groups
		}
	} catch (e) {
		console.log("Error parsing GRPindex in removeSelfFromGrps: " + e.message);
		return;
	}
	
	for (var i = 0, len = GRPindex.length; i < len; i++){
		var extGrpObj = JSON.parse(localStorage["GRP-" + GRPindex[i]]);
		localStorage["GRP-"+GRPindex[i]] = JSON.stringify(spliceSelf(extGrpObj));
	}
}

function grpWeeder(extId){
	var GRPindex = [];
	try {
		if (localStorage.GRPindex) {
			GRPindex = JSON.parse(localStorage.GRPindex);
		} else {
			return; // Nothing to do if no groups
		}
	} catch (e) {
		console.log("Error parsing GRPindex in grpWeeder: " + e.message);
		return;
	}
	
	for (var i = 0, len = GRPindex.length; i < len; i++) {
		try {
			var grpKey = "GRP-"+GRPindex[i];
			if (!localStorage[grpKey]) {
				continue; // Skip if group data doesn't exist
			}
			
			var extGrpObj = JSON.parse(localStorage[grpKey]);
			var grpItems = extGrpObj.items || [];

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
		} catch (e) {
			console.log("Error processing group in grpWeeder: " + e.message);
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