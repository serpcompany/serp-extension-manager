var defaultSettings = {
	"grpExt" : true,
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
	"showStore" : true,
	"launchApp" : false,
	"showP" : false,
	"importMode" : "1",
	"searchSave" : false,
	"advGrpVw" : true,
	"rightClickDel" : true,
	"showLat" : false,
	"searchTop" : false,
	"showLD" : false,
	"tabTop" : false,
	"onlyOne" : false,
	"showGrp" : false,
	"theme" : "1"
};
var selfId = chrome.i18n.getMessage("@@extension_id");

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
	return chrome.extension.getURL('icon-gen' + size + '.png');
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
}
	());

//detect overlap and with overlapping grp state + activating grp state determine ext state
function chkGrpOvrlap(extId, grpFrom, fromState) {
	var finalState = false;
	if (!fromState) {
		var GRPindex = JSON.parse(localStorage.GRPindex);
		for (var i = 0, len = GRPindex.length; i < len; i++) {

			var extGrpObj = JSON.parse(localStorage["GRP-"+GRPindex[i]]);
			var grpState = extGrpObj.enabled;
			var grpName = extGrpObj.name;
			var grpItems = extGrpObj.items;
			// console.log("*CHECK! ("+grpName+")--"+len+"|"+i);

			if (grpName != grpFrom) {
				if(grpItems.indexOf(extId) > -1) {
					// console.log("*OVERLAP!! - "+grpItems[j]+" ("+grpName+")"+" ** from grp that is: "+fromState);
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
	for(var j =0, len = extList.length; j<len; j++){
		if(extList[j].id==extIdToChk) {found=true; foundObj=extList[j]; break;}
	}
	return [found,foundObj];
}

//returns array of enabled & of true grp size
function getEnabledCount(grp, extList) {
	// console.log("EN COUNT");
	var enabledCount = 0;
	var gItems = grp.items;
	var unfound = 0;

	for (var w = 0, len = gItems.length; w < len; w++) {
		var found = isInstalled(extList,gItems[w]);
		if(found[0]&&found[1].enabled){enabledCount++;}
		if(!found[0]){unfound++;}
	}
	var realSize = gItems.length - unfound;
	// console.log("EN COUNT="+enabledCount+"/"+extList.length+"/"+gItems.length+"/"+unfound);
	return [enabledCount,realSize];
}

//toggle enable/disable
function enableGrp(grpName, importing, force, context) {
	// console.log("ENABLE GROUP");
	if(force===undefined) force = false;
	if(context===undefined) context = false;
	chrome.management.getAll(function (extList) {
		var settings = JSON.parse(localStorage["settings"]);
		if(!settings.onlyOne||force){
			var extGrpObj = JSON.parse(localStorage["GRP-" + grpName]);
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
						if (!importing && settings.tabPage == 2&&!context) {
							if (settings.advGrpVw)
								enableExt(grpItems[i], false);
							else
								setGrpState();
						}
						if(context) setGrpStateOnly();
					}
				}
			}	
		}		
		else disableAllExcept(grpName,context);
	});
}

//hard disable
function disableGrp(grpName, context) {
	// console.log("DISABLE GROUP");
	if(context===undefined) context = false;
	chrome.management.getAll(function (extList) {
		var settings = JSON.parse(localStorage["settings"]);
		var extGrpObj = JSON.parse(localStorage["GRP-" + grpName]);
		var grpItems = extGrpObj.items;

		for (var i = 0, s = grpItems.length; i < s; i++) {
			if (grpItems[i] != selfId) {
				var found = isInstalled(extList, grpItems[i]);
				if(found[0]){
					chrome.management.setEnabled(grpItems[i], false);
					if (settings.tabPage == 2&&!context) {
						if (settings.advGrpVw)
							enableExt(grpItems[i], false);
						else
							setGrpState();
					}
					if(context) setGrpStateOnly();
				}
			}
		}
	});
}
function disableAllExcept(grpName, context){
	var GRPindex = JSON.parse(localStorage.GRPindex);
	for (var i = 0, k = GRPindex.length; i < k; i++){
		disableGrp(GRPindex[i],context);
	}
	enableGrp(grpName,false,true,context);
}

//grp state by member state
function setGrpState() {
// console.log("CHK MEMBERS");
	chrome.management.getAll(function(extList) {
		var settings = JSON.parse(localStorage["settings"]);
		var GRPindex = JSON.parse(localStorage.GRPindex);
		for (var i = 0, k = GRPindex.length; i < k; i++){
			
			var grp = JSON.parse(localStorage["GRP-"+GRPindex[i]]);
			var counts = getEnabledCount(grp, extList);
			// console.log("Set "+GRPindex[i]+": "+counts[0]+"/"+counts[1]);
			
			// chk before and after if got change than write?
			var chkbox = document.getElementById("ch."+grp.id);
			var name = document.getElementById("gp."+grp.id);
			if(counts[0]!=counts[1]||counts[1]==0) {
				grp.enabled = false; 
				if(counts[0]==0) {chkbox.checked = false; }
				else if(counts[1]==0) {chkbox.disabled = true; }
				else {chkbox.className = "cellEnabler enabler.grp fade"; chkbox.checked = true; }
				name.className = "cellName header disabled";
			}
			else {
				grp.enabled = true;
				chkbox.checked = true;
				name.className = "cellName header";
				chkbox.className = "cellEnabler enabler.grp";
			}
			localStorage.setItem("GRP-"+GRPindex[i],JSON.stringify(grp));
			if (!settings.noContext) chrome.contextMenus.update(grp.id,{"checked": grp.enabled});
		}	
	});
}

function setGrpStateOnly() {
	chrome.management.getAll(function(extList) {
		var GRPindex = JSON.parse(localStorage.GRPindex);
		for (var i = 0, k = GRPindex.length; i < k; i++){
			var grp = JSON.parse(localStorage["GRP-"+GRPindex[i]]);
			var counts = getEnabledCount(grp, extList);
			
			if(counts[0]!=counts[1]||counts[1]==0) {grp.enabled = false;}
			else {grp.enabled = true;}
			
			localStorage.setItem("GRP-"+GRPindex[i],JSON.stringify(grp));
			chrome.contextMenus.update(grp.id,{"checked": grp.enabled});
		}	
	});
}

function chkNameForInvalid(inputtxt) { 
  var letters = /[@!#%*:<>?/{|}"',.]/;
  if (letters.test(inputtxt)) {
    //Invalid found
    return true;
  } else {
    //Not found
    return false;
  }
}

function saveExtGrp(mode,fromOptions,popupNG,popParam) {
//console.log("in saveExtGrp, mode"+mode);
	//mode: 1=save to same(edit), 2=save as new
	var nameBox = document.getElementById('grpName');
	var nameBoxVal = nameBox.value;
	var oriGrpName = document.getElementById('savGrpButton').name;
	var GRPindex = JSON.parse(localStorage.GRPindex);
	var doSave = true;
	var state = true;
	
	if(nameBoxVal===""){
		nameBox.className = "flash";
	}
	else{
		if(chkNameForInvalid(nameBoxVal)) {
			nameBox.className = "alert";
			alert(chrome.i18n.getMessage("opt_grpname_invalid"));
			doSave=false;
		}
		else{
			//check for overwrite
			var gotSame = false;
			if(GRPindex.indexOf(nameBoxVal)!=-1) gotSame = true;
			if(gotSame){
				var ask=confirm(chrome.i18n.getMessage("opt_egrp_saveOver"));
				if(ask==true){
					nameBox.className = "";
					doSave=true;
				}
				else{
					nameBox.className = "alert";
					doSave=false;
				}
			}
		}
		
		if(doSave){
			if(!popupNG){
				if(mode==1&&localStorage["GRP-"+oriGrpName]!=null){
				//console.log("An edit save, del before saving");
					var extGrpObj = JSON.parse(localStorage["GRP-"+oriGrpName]);
					state = extGrpObj.enabled;
					removeGrp(oriGrpName,mode);
				}
			
				var itemList = document.getElementsByName('enabler');
				var selectedItems=[];
				for(var i = 0, m = itemList.length; i < m; i++){
					if(itemList[i].checked){
						var extID = (itemList[i].id.split("."))[1];
						if(selectedItems.indexOf(extID)==-1) {
						// chrome.management.setEnabled(extID, state);
						selectedItems.push(extID);}
					}
				}
				
				var grpObj = {"name":nameBoxVal,"id":nameBoxVal,"type":"extGrp","enabled":state,"items":selectedItems,"expand":true};
				addGrp(grpObj,JSON.parse(localStorage.GRPindex),fromOptions,mode,oriGrpName);
				
				closeOverlay();
			}
			else{
				//for popup right click new grp
				chrome.management.get(popParam, function(extInfo) {
					state = extInfo.enabled;
					var selectedItems=[];
					selectedItems.push(popParam);

					var grpObj = {"name":nameBoxVal,"id":nameBoxVal,"type":"extGrp","enabled":state,"items":selectedItems,"expand":true};
					addGrp(grpObj,JSON.parse(localStorage.GRPindex),fromOptions,mode,oriGrpName);
					
					closeOverlay();
					location.reload(true);
				});
			}
		}
	}
}

function addGrp(grpObj,GRPindex,fromOptions,mode,oldName){
	(function (GRPindex) {
	sortGrpItems(grpObj.items,function(sortedItems){
		grpObj.items = sortedItems;
		localStorage["GRP-"+grpObj.id] = JSON.stringify(grpObj);
		if(GRPindex.indexOf(grpObj.id)==-1&&mode!==1) {
			GRPindex.push(grpObj.id);
			localStorage.GRPindex = JSON.stringify(GRPindex);
		}
		if(mode==1){
			var index = GRPindex.indexOf(oldName);
			if (index !== -1) {
				GRPindex[index] = grpObj.id;
			}
			localStorage.GRPindex = JSON.stringify(GRPindex);
		}
		menuCreate();
		if(fromOptions){loadExtGrpList();}
	});
	})(GRPindex);
}

function removeGrp(grpId,editOnly){
	var GRPindex = JSON.parse(localStorage.GRPindex);
	delete localStorage["GRP-"+grpId];
	if(editOnly!=1){
		GRPindex.splice(GRPindex.indexOf(grpId),1);
		localStorage.GRPindex = JSON.stringify(GRPindex);
	}
}

function sortGrpItems(itmArr,callback){
	chrome.management.getAll(function (extList) {
		var settings = JSON.parse(localStorage["settings"]);
		var objArr = [];
		var sortedIdArr = [];
		
		for(var i =0, j = itmArr.length; i<j; i++){
			var found = isInstalled(extList, itmArr[i]);
			if(found[0]){objArr.push(found[1]);}
			else{objArr.push(notInstalledObj(itmArr[i]));}
		}
				
		objArr.sort(sort_by({name:'name',primer:function(a){return a.toUpperCase();},reverse:false}));
		
		for(var k =0, b = objArr.length; k<b; k++){
			sortedIdArr.push(objArr[k].id);
		}
		
		callback(sortedIdArr);
	});
}

function isInGrp(extId) {
// console.log("CHK IF IN GRP "+localStorage.length);
	var grpList = chrome.i18n.getMessage("opt_egrp_opt7");
	var GRPindex = JSON.parse(localStorage.GRPindex);
	for(var i=0,m=GRPindex.length; i<m; i++) {
		var extGrpObj = JSON.parse(localStorage["GRP-"+GRPindex[i]]);
		var grpName = extGrpObj.name;
		var grpItems = extGrpObj.items;
		// console.log("- checking "+grpName+", "+i);
		for (var k = 0, s = grpItems.length; k < s; k++) {
			if(grpItems[k]==extId){
			// console.log("-- hit!");
				grpList+="\n- "+grpName;
			}
		}
	}
	// console.log("!! return: "+grpList);
	return grpList;
}

function menuCreate() {
	// console.log("REMAKE R_MENU");
	var settings = JSON.parse(localStorage["settings"]);
	var GRPindex = JSON.parse(localStorage.GRPindex);
	chrome.contextMenus.removeAll();

	if (!settings.noContext) {
		for (var i = 0, k = GRPindex.length; i < k; i++) {
			var extGrpObj = JSON.parse(localStorage["GRP-"+GRPindex[i]]);
			chrome.contextMenus.create({
				"title" : extGrpObj.name,
				"type" : "checkbox",
				"contexts" : ['page', 'browser_action'],
				"id" : extGrpObj.id,
				"checked" : extGrpObj.enabled
			});
		}
	}
}

function updateIcon() {
	var settings = JSON.parse(localStorage["settings"]);

	if (settings.altBut) {
		chrome.browserAction.setIcon({
			path : {
				"19" : "icon-19-1.png",
				"38" : "icon-38-1.png"
			}
		});
	} else {
		if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
			// dark mode
			chrome.browserAction.setIcon({
				path : {
					"19" : "icon-19-2.png",
					"38" : "icon-38-2.png"
				}
			});
		}
		else{
			chrome.browserAction.setIcon({
				path : {
					"19" : "icon-19-0.png",
					"38" : "icon-38-0.png"
				}
			});
		}
	}
}

//link locale + icon switcher
function linkSwitcher(link) {
	var chr = "https://chrome.google.com/webstore/category/extensions";
	var opr = "https://addons.opera.com/";
	var locale = window.navigator.language;
	// var vendor = window.navigator.vendor;
	var linkCont = document.getElementById('storeContInner');
	var linkRef = link.href;
	if (isOpera()) {
		linkCont.style.backgroundImage = "url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAJmSURBVDhPrZLdS1NxGMd/uXYRBXK2cHMlUVn5tklugtEbuZyQlhaNytJ8yVV00UURFQSlMGJIUVFwKKu5CNNCk9CVdSFZQRyL0xo1qLsu6moX+wOevs/YGXMclpWDD8/v+T7PPvzO2QQRzSu64f8wq3kkrEmGhNUNxoCSqm5txpwTksj+6AoHsZwi/LP9FP04dJJ+dZwm7rVZSFjEfdR7GVwHukJefoghCEc9BxNfm7so6mlJcM85z4Oocxby4gAI4RGB8t17jLhyzznL/lYoA4UZlkpin3a00lOLI6ZlGchzEvZjObqznb40ddIHzwF6u2U3Kdv3EYsjDW30ufEwfdt7lHgP8L64lUsoY/G5qyEeWFSqMi9wfr1xF01taEzzsb6FeA+Im+BGLqFfrPBdFKtk4AS+vsVlkelNTfTSVZ/mfa2XcCtFk+UUQpKNMrSymh7YHPSkuIYmHLX0busegkABbhBO4dYV9mbd8LJxTWTQaqegtDbJgGkdja6uobv4wa5AOrm+LjFTt59wHtMVXjUsU4P5ZXG/oVhlQiZ7fKTAQSOWyiSPzeU0LJXSqyoP8auYdHrozeZmCkCuK+zLs6njUgWNm+w0YXbQ7fyS+JGFyyNeYVG6jUWRfnNFfAKza8aimB+SZ/ZtCf4n4Kx/wwCEU1IlaXTkFaqQ+YDg2mmwqdPWauqBrBfvDTXM8FlX2AOhIlWRRhd6iJwpoZP7maUuOosbXxAF4hJyBtK0Y5bwDL4QlVykMbqkPA6RnBLK3HN+HEIgzv9J2L2g8M4JSDNpw6MCwVXLWiFPZbmF84Fu+O+Q+A3DBSPmzPwXSAAAAABJRU5ErkJggg==)";
		if (locale.substr(0, 2) == "en")
			locale = "en";
		link.href = opr + locale.toLowerCase() + "/extensions/";
	}
	else {
		linkCont.style.backgroundImage = "url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAMtSURBVDhPvZJrSBRRGIaHrkQ/KvoTFF2QkC6w3ciiRFOUNGsJ7GZiiWE3KtLK0rCbv4NdiC5iUsFu64plQWV0kSBEslVxuxGtsbtBS7Wzy+zu7Mycmbc5Z9bUdn9ERC88w2HmO8/5zjnD/bcUFxePb2pqSmttbV00EvqOfkuU/XHG9fb25vM87wkEAhhJMBj0uFyufFpjlKbOWB266hCTY7HYY7/f31xbW5tZV1fHoGOv19ssCJHHtOa3OdRhpLGxcV40GrUNIQiCnRASiMfjbj4UcvAh3oAPOvSF3LIsB0KhsD0cDtt4Rsh2+crleQkdx7W1tZkwKprx1DR9pEHVVAOVMAhRoSiEISmKjowWZ4spoeM4p9O5hBlYhmSGUGUMC/XOGb8L7bftqYRUNqI7KlOpSP0lGi1UIDNk3E4tNMK6oxP9PpD3b6B+cDPIex2/F0SWmZDKaIcphUyS2KYmCFCcdsjV+6Du3wHtcClwqBTq3m2Qj1ZCarFBCYV/CSVZgt2eJDS2qH35ArGyAvH8LMjmPJDtG6CWboRashFkSwGkolyIuZkQ95RD9vqgsHNV4HA4krcsRXgIp46BrFgBdc0qaDmZwPpsoDAHKFgH5GVBy1oDNWMlFNNSkMPV0P90dky6I1n4LNCBW6eyEZ+/CGSxCerS5dA2FALn6wFLDXAuF9rJBdBOpEM9Ph+kJh2a63pqoaLJqH57BGUvzXiXsRixtIWIVRxEV/dnNHVHYBsQ0Of7BMVTDLybDHyaAPjGA9/oLxxPFnqiHpT3l2JLvxkXz2bi68rVeNo5iN334jj4SELVExmHOiR0+TzA9xm6iDP4MR0gr5OFb8Ju7OotYcKdnUW4d6wMRzpkZN8QUWQXYXaIKLCJOPNCgRhcOyz8PlU//M7RQnpDbn6AlPXowj4zo+7Ofhy4L2DhJQFLrkaw7FoUpisR1DyVIP7IGBZ+mwYt/pyMuuWqqqpZ7a/aGzbf3WQpfJBnLXyYZy3p2GqtudllmX26xzqnvt8698yAZW59n/VC+4BlsG+mddDFWRg9U6wf3c0NumNmQscyRmeizqS/hM6ljn8djvsJhvNVNRQKqQMAAAAASUVORK5CYII=)";
		link.href = chr + "?hl=" + locale;
	}
}

function weedQ(qName,extID){
	var queue = JSON.parse(localStorage.getItem(qName));
	var index = queue.indexOf(extID);
	if (index > -1) {queue.splice(index, 1);
	localStorage.setItem(qName,JSON.stringify(queue));}
}

function notInstalledObj(extId){
	return {id:extId,type:"not_installed",name:chrome.i18n.getMessage("det_notInst"),homepageUrl:storeUrl(extId)};
}
