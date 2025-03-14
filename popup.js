// Initialize default settings if not present
var settings = {};
var GRPindex = [];
var filterTimeOut, filterStrings, reloadTimeOut;
var popHeight, popWidth;

// Load settings from chrome.storage.local or localStorage as fallback
chrome.storage.local.get(['settings', 'GRPindex'], function(result) {
	// Use chrome.storage.local values if available, otherwise fall back to localStorage
	settings = result.settings || (localStorage.settings ? JSON.parse(localStorage.settings) : {});
	GRPindex = result.GRPindex || (localStorage.GRPindex ? JSON.parse(localStorage.GRPindex) : []);
	
	// Initialize UI with the loaded settings
	initializeUI();
});

chrome.management.onUninstalled.addListener(function(extId){switchTab(settings.tabPage,true);});

function uninstallOvl(extInf){
	document.getElementById('titleBox').innerHTML = chrome.i18n.getMessage("popup_uninstall_prompt_title");
	document.getElementById('noButton').innerHTML = chrome.i18n.getMessage("popup_uninstall_prompt_cancel");
	document.getElementById('yesButton').innerHTML = chrome.i18n.getMessage("popup_uninstall_tooltip");

	openOverlay("uninstallPrompt");
	document.getElementById('uinIco').innerHTML = "<img class=\"uinImg\" src="+getIconURL(extInf,128)+">";
	document.getElementById('uinTxt').innerHTML = chrome.i18n.getMessage("popup_uninstall_tooltip")+" \""+extInf.name+"\"?";
	
	document.getElementById('noButton').addEventListener('click', function(){closeOverlay();});
	document.getElementById('yesButton').addEventListener('click', function(){uninstallExt(extInf.id);closeOverlay();});
}

function uninstallExt(extID){
	chrome.management.uninstall(extID,{showConfirmDialog:true});
}

function disSelfOvl(callback){
	document.getElementById('titleBox').innerHTML = "SERP Extension Manager";
	document.getElementById('noButton2').innerHTML = chrome.i18n.getMessage("popup_disSelf_prompt_no");
	document.getElementById('yesButton2').innerHTML = chrome.i18n.getMessage("popup_disSelf_prompt_yes");

	openOverlay("disablePrompt");
	document.getElementById('disTxt').innerHTML = chrome.i18n.getMessage("popup_disSelf_prompt_msg");
	
	document.getElementById('noButton2').addEventListener('click', function(){closeOverlay(); callback(false);});
	document.getElementById('yesButton2').addEventListener('click', function(){callback(true);});
}

function newGrpOvl(mode,param){
	//mode: 1 = all enabled to new grp, 2 = right-click new grp, use with param
	document.getElementById('titleBox').innerHTML = chrome.i18n.getMessage("opt_egrp_floatTitle1");
	document.getElementById('noButton3').innerHTML = chrome.i18n.getMessage("popup_uninstall_prompt_cancel");
	document.getElementById('savGrpButton').innerHTML = chrome.i18n.getMessage("opt_egrp_opt5");
	document.getElementById('grpName').value = "";
	openOverlay("newGrpPrompt");
	
	document.getElementById('noButton3').addEventListener('click', function(){closeOverlay();});
	if(mode==1) document.getElementById('savGrpButton').addEventListener('click', function(){saveExtGrp(2,false);});
	if(mode==2) document.getElementById('savGrpButton').addEventListener('click', function(){saveExtGrp(2,false,true,param);});
}

function openOverlay(set) {
	document.getElementById('ovl').className = "overlay visible";
	var ovlFaces = document.getElementById('ovl').getElementsByClassName('innerOver');
	for(var i = 0, v = ovlFaces.length; i<v; i++){
		if(ovlFaces[i].id!=set) {ovlFaces[i].setAttribute("hidden","");}
		else {ovlFaces[i].removeAttribute("hidden");}
	}
	document.getElementById('closeOver').addEventListener('click', function(){closeOverlay();});
}
function closeOverlay() {
	document.getElementById('ovl').className = "overlay hidden";
}

function enableExt(extID,selfChk){
	var check = document.getElementsByClassName("ch."+extID);
	var settingIcon = document.getElementsByClassName("op."+extID);
	var icon = document.getElementsByName("ic."+extID);
	var name = document.getElementsByClassName("na."+extID);
	chrome.management.get(extID, function(extInfo){
		var extState = extInfo.enabled;
		if(selfChk) {
			function enabler(){chrome.management.setEnabled(extID,!extInfo.enabled); extState = !extState;}
			if(extID!=selfId){ enabler(); }
			else{
				if(extState){
					disSelfOvl( function(r){
						if (r==true) { enabler(); }
					});
				}
			}
		}
		for (var j = 0, f = check.length; j < f; j++) {
			check[j].checked = extState;
			if(extState){
				icon[j].className = "pImg ic."+extInfo.id;
				name[j].className = "cellName na."+extInfo.id;
				if(settings.showSet&&extInfo.optionsUrl)settingIcon[j].removeAttribute("hidden");
			}else{
				icon[j].className = "pImg disabled ic."+extInfo.id;
				name[j].className = "cellName disabled na."+extInfo.id;
				if(settings.showSet&&extInfo.optionsUrl)settingIcon[j].setAttribute("hidden","");
			}
		}
		if(settings.tabPage==1)extCount();
		if(settings.tabPage==2){setGrpState();extGrpCount();}
	});
}

function launchApp(extID) {
	var check = document.getElementById("ch."+extID);
	if(check.checked){
		chrome.management.launchApp(extID);
	}
}

function extCount() {
	if(settings.showCount){
		var extOn = 0;
		var extAll = 0;
		var appOn = 0;
		var appAll = 0;
		var thmOn = 0;
		var thmAll = 0;
		//get all ext info and work with it
		chrome.management.getAll(function(extList) {
		
			for (var j = 0, f = extList.length; j < f; j++) {
				var extInfo = extList[j];
				var extType = extInfo.type;
				if(extType=="extension") {
					extAll++; 
					if(extInfo.enabled)extOn++;
				}
				if(extType=="theme") {
					thmAll++; 
					if(extInfo.enabled)thmOn++;
				}
				if(extType.substring(extType.length-3)=="app") {
					appAll++; 
					if(extInfo.enabled)appOn++;
				}
			}
			
			document.getElementById('extNo').innerHTML = extOn+"/"+extAll;
			document.getElementById('appNo').innerHTML = appOn+"/"+appAll;
			document.getElementById('thmNo').innerHTML = thmOn+"/"+thmAll;
			document.getElementById('allNo').innerHTML = (extOn+appOn+thmOn)+"/"+(extAll+appAll+thmAll);
				
		});
	}
}

function extGrpCount() {
	if(settings.showCount){
		chrome.management.getAll(function(extList) {
			// Use chrome.storage.local for GRPindex
			chrome.storage.local.get(['GRPindex'], function(result) {
				var GRPindex = result.GRPindex || (localStorage.GRPindex ? JSON.parse(localStorage.GRPindex) : []);
				
				for(var i=0, j=GRPindex.length; i<j; i++) {
					// Use chrome.storage.local for each group
					(function(groupName) {
						chrome.storage.local.get(['GRP-'+groupName], function(result) {
							var extGrpObj = result['GRP-'+groupName] || (localStorage['GRP-'+groupName] ? JSON.parse(localStorage['GRP-'+groupName]) : null);
							if (!extGrpObj) return;
							
							var grpId = extGrpObj.name;
							var extIDinGrp = extGrpObj.items;
							var enabledInGrp = 0;
							
							for(var w = 0, q = extIDinGrp.length; w < q; w++){
								var found = isInstalled(extList, extIDinGrp[w]);
								if(found[0]){
									exInfo = found[1];
									if(exInfo.enabled){enabledInGrp++;}
								}
							}
							
							var countElement = document.getElementById('ct.'+grpId);
							if (countElement) {
								countElement.innerHTML = enabledInGrp+"/"+extIDinGrp.length;
							}
						});
					})(GRPindex[i]);
				}
			});
		});
	}
}

function allDisable(stateStr){
	//create a group to rem curr state, disable items along the way
	var itemList = document.getElementsByClassName('enabler.ext');	
	var selectedItems=[];
	
	for(var i = 0, m = itemList.length; i < m; i++){
		if(itemList[i].checked){
			var extID = (itemList[i].id.split("."))[1];				
			enableExt(extID, true);
			selectedItems.push(extID);
		}
	}
	
	if(selectedItems.length > 0){
		// Save to both localStorage and chrome.storage.local
		localStorage[stateStr] = JSON.stringify(selectedItems);
		chrome.storage.local.set({[stateStr]: selectedItems});
	}
}

function allEnable(stateStr){
	// Get state from chrome.storage.local with fallback to localStorage
	chrome.storage.local.get([stateStr], function(result) {
		var grpItems = result[stateStr] || (localStorage[stateStr] ? JSON.parse(localStorage[stateStr]) : []);
		
		//Enable, w/check if all disabled
		if(grpItems.length > 0){
			for (var i = 0, s = grpItems.length; i < s; i++) {
				enableExt(grpItems[i], true);
			}
		}
		
		//Delete state from both storages
		localStorage.removeItem(stateStr);
		chrome.storage.local.remove(stateStr);
	});
}

function disableAllHandler(stateStr){
	//console.log("DISABLE ALL!");
	var btn = document.getElementById('disableAll');
	
	//if no state set btn title and text, vice versa
	chrome.storage.local.get([stateStr], function(result) {
		var hasState = result[stateStr] || localStorage.getItem(stateStr);
		
		if (!hasState) {
			allDisable(stateStr);
			btn.title = chrome.i18n.getMessage("popup_btn_enable_tooltip");
			btn.innerText = chrome.i18n.getMessage("popup_btn_enable_text");
		} else {
			allEnable(stateStr);
			btn.title = chrome.i18n.getMessage("popup_btn_disable_tooltip");
			btn.innerText = chrome.i18n.getMessage("popup_btn_disable_text");
		}
	});
}

function btnSetter(stateStr){
	var btn = document.getElementById('disableAll');

	chrome.storage.local.get([stateStr], function(result) {
		var hasState = result[stateStr] || localStorage.getItem(stateStr);
		
		if (!hasState) {
			btn.title = chrome.i18n.getMessage("popup_btn_disable_tooltip");
			btn.innerText = chrome.i18n.getMessage("popup_btn_disable_text");
		} else {
			btn.title = chrome.i18n.getMessage("popup_btn_enable_tooltip");
			btn.innerText = chrome.i18n.getMessage("popup_btn_enable_text");
		}
	});
}

function makeRow(extInfo,fragment,grp) {
	var extType = extInfo.type;

	if((extType=="extension")||(extType=="extGrp")||(extType=="theme"&&settings.showThm)||(extType.substring(extType.length-3)=="app"&&settings.showApp)){
		var row = document.createElement("div");
		row.id = extInfo.id;
		row.className = "ext";
		if(extInfo.installType=="development") {row.className += " dev";}
		if(extType!="extGrp") {row.setAttribute("name","ext");}
		else {
			row.setAttribute("name","extGrp");
			row.setAttribute("grp",extInfo.id);
			if(settings.advGrpVw) row.className += " advGrpTitle header";
			else row.className += " container";
		}
		row.setAttribute("tabindex","-1");
		var cell = document.createElement("div");
		
		var link = document.createElement("a");
		var image = document.createElement("img");
		image.className = "pImg";

		//checkbox
		var element1 = document.createElement("input");
		if(!settings.showChk) element1.style.display = 'none';
		element1.className = "cellEnabler";
		if(grp===undefined&&extInfo.type!="theme") element1.setAttribute("name","enabler");
		if(extType!="extension"&&extType!="extGrp") element1.className += " appChk";
		if(extType=="theme") element1.disabled = true;
		if(extType=="extension") element1.className += " enabler.ext";
		else if(extType=="extGrp") element1.className += " enabler.grp";
		element1.id = "ch."+extInfo.id;
		element1.type = "checkbox";
		element1.title = chrome.i18n.getMessage("popup_checkbx_tooltip");
		element1.checked = extInfo.enabled;
		if(extType!="extGrp") {
			element1.addEventListener('click',function(){enableExt(extInfo.id,true);});
			element1.className += " ch."+extInfo.id;
		}
		if(extType=="extGrp") {
			element1.addEventListener('click',function(){enableGrp(extInfo.id,false);});
		}
		row.appendChild(element1);
		
		//icon
		if(extType!="extGrp"){
			var element2 = link.cloneNode(false);
			element2.className = "icoCont";
			element2.target = "_blank";
			element2.title = chrome.i18n.getMessage("popup_icon_tooltip");
			var element2a = image.cloneNode(true);
			element2a.id = "ic."+extInfo.id;
			element2a.width = 16;
			element2a.height = 16;
			element2a.src = getIconURL(extInfo,0);
			element2a.name = "ic."+extInfo.id;
			if(grp!==undefined){element2a.setAttribute("grp",grp);}
			if(!extInfo.enabled){
				element2a.className = "pImg disabled";
			}
			var icoLink = "";
			if(extInfo.installType!="development"){
				if(typeof extInfo.updateUrl != "undefined"){
					if((extInfo.updateUrl).indexOf("google") > -1){icoLink = storeUrl(extInfo.id,true);}
					else{icoLink = storeUrl(extInfo.id);}
				} else {icoLink = extInfo.homepageUrl;}
			}
			if(icoLink!=""){
				element2.href = icoLink;
				element2.appendChild(element2a);
				row.appendChild(element2);
			}
			else{
				row.appendChild(element2a);
			}
		}
		
		//name
		var element3 = document.createElement("div");
		var element3a = document.createElement("span");
		element3.setAttribute("name","namae");
		element3.className = "cellName na."+extInfo.id;
		element3.id = "na."+extInfo.id;
		if(extType!="extGrp"){ 
			element3.title = "[ "+extInfo.version+" | "+extInfo.installType+" "+extInfo.type+" ]";
			if(extInfo.description) element3.title += "\n"+extInfo.description
			if(settings.launchApp&&(extInfo.type!="extension"&&extInfo.type!="theme")) {element3.addEventListener('click',function(){launchApp(extInfo.id);});}
			else {element3.addEventListener('click',function(){enableExt(extInfo.id,true);});}
			if(settings.showP){
				var per = extInfo.permissions, noOfPer = per.length;
				var perStr = "\n\n"+chrome.i18n.getMessage("popup_perm");
				if(noOfPer>0){
					for (var i = 0; i < noOfPer; i++) {
						perStr+="\n- "+per[i];
					}
				}else{
					perStr+="\n- "+chrome.i18n.getMessage("popup_pNon");
				}
				element3.title += perStr;
			}
			if(grp!==undefined){element3.setAttribute("grp",grp);}
		}
		element3a.className = "buttonText";
		if(extType=="extGrp"){ 
			element3.id = "gp."+extInfo.id; //note
			element3a.setAttribute("grp",extInfo.id);
			element3.addEventListener('click',function(){enableGrp(extInfo.id,false);});
			if(settings.advGrpVw) {
				element3a.className = " advGrpTitleTxt header";
			}
			else element3a.className += " mGrpTxt";
		}		
		element3a.textContent = extInfo.name;
		if (filterStrings!=null) element3a.innerHTML=(element3a.textContent).multiReplace(filterStrings);
		element3.appendChild(element3a);
		if(!extInfo.enabled){
			element3.className += " disabled";
		}
		row.appendChild(element3);
		
		//adv grp count
		if(extType=="extGrp"){
			var elementX = document.createElement("span");
			elementX.id = "ct."+extInfo.id;
			elementX.className = "sideTxt";
			if(settings.advGrpVw) elementX.className += " adv";
			if(!extInfo.enabled) elementX.className += " disabled";
			row.appendChild(elementX);
		}
		
		//adv grp accordion btn
		if(extType=="extGrp" && settings.advGrpVw){
			var elementX1 = document.createElement("button");
			elementX1.id = "btn."+extInfo.id;
			elementX1.className = "accordion";
			if(extInfo.expand) elementX1.className += " active";
			elementX1.setAttribute("grp",extInfo.id);
			elementX1.addEventListener("click", function() {
				////https://www.w3schools.com/howto/howto_js_accordion.asp
				this.classList.toggle("active");

				var panel = document.getElementById("panel."+extInfo.id);
				if (panel.style.display === "block") {
					panel.style.display = "none";
					saveExpand(false,extInfo.id);
				} else {
					panel.style.display = "block";
					saveExpand(true,extInfo.id);
				}
			});
			row.appendChild(elementX1);
		}
		
		//side buttons
		if(extType!="extGrp"&&(settings.showSet||settings.showDel||settings.showGrp)){
			var rightCont = document.createElement("div");
			rightCont.className = "rightCont";
			//grouped
			var grouped = isInGrp(extInfo.id);
			var match = /\r|\n/.exec(grouped);
			if(match){
				var elementY = document.createElement("span");
				if(!settings.showGrp) elementY.setAttribute("hidden","");
				elementY.className = "righted sideB";
				elementY.textContent = "G";
				elementY.id = "gp."+extInfo.id;
				elementY.title = grouped;
				rightCont.appendChild(elementY);
			}
			//options
			if(extInfo.optionsUrl){
				var element4 = link.cloneNode(false);
				element4.className = "cellSet op."+extInfo.id;
				element4.id = "op."+extInfo.id;
				element4.addEventListener("click", function(){chrome.tabs.create({url: extInfo.optionsUrl})});
				if(!settings.showSet||!extInfo.enabled) element4.setAttribute("hidden","");
				element4.target = "_blank";
				element4.title = chrome.i18n.getMessage("popup_options_tooltip");
				var element4a = image.cloneNode(true);
				element4a.src = "set.png";
				element4a.className += " sideB";
				element4.appendChild(element4a);
				rightCont.appendChild(element4);
			}
			//uninstall
			var element5 = link.cloneNode(false);
			element5.setAttribute("name","uninstaller");
			element5.addEventListener('click',function(){if(isOpera()) uninstallOvl(extInfo); else uninstallExt(extInfo.id);});
			if(!settings.showDel) element5.setAttribute("hidden","");
			element5.className = "cellDel";
			element5.id = "un."+extInfo.id;
			element5.title = chrome.i18n.getMessage("popup_uninstall_tooltip");
			var element5a = image.cloneNode(true);
			element5a.src = "del.png";
			element5a.className += " sideB";
			element5.appendChild(element5a);
			rightCont.appendChild(element5);
			
			row.appendChild(rightCont);
		}
		
		fragment.appendChild(row);
	}
	
	if(extType=="not_installed"){
		var frag2 = document.createElement("span");
		var contents ="<div class=\"ext\" name=\"ext\" tabindex=\"-1\">";
		if(settings.showChk) contents+="<input class=\"cellEnabler\" name=\"enabler.ext\" type=\"checkbox\" disabled>";
		contents+="<img class=\"pImg\" width=\"16\" height=\"16\" src=\""+getIconURL(extInfo,0)+"\"><a href=\""+extInfo.homepageUrl+"\" target=\"_blank\" class=\"notInsText\">"+chrome.i18n.getMessage("det_notInst")+"</a></div>";
		frag2.innerHTML = contents;
		fragment.appendChild(frag2);
	}
	
}

function chkEmptyPgItm(fragment, type) {
	if(fragment.childNodes.length==0){
		var row = document.createElement("div");
		row.className = "empty";
		if(filterStrings!=null) row.innerHTML = chrome.i18n.getMessage("popup_search_no_result")+"<b>"+filterStrings+"</b>'";
		else if(type=="ext") row.innerText = chrome.i18n.getMessage("popup_noItmMsg");
		else row.innerHTML = chrome.i18n.getMessage("popup_noGrpMsg")+"<br/><br/><a href=\"chrome-extension://"+selfId+"/options.html\" target=\"_blank\">>>"+chrome.i18n.getMessage("popup_options_tooltip")+"</a>"; 
		fragment.appendChild(row);
	}
}

function writeToPage(fragment,canvas){
	var fragGrp = document.createElement("span");
	fragGrp.appendChild(fragment);
	canvas.appendChild(fragGrp);
	canvas.replaceChild(fragGrp,canvas.childNodes[0]);
}

function saveExpand(state,grpID){
	chrome.storage.local.get(['GRP-'+grpID], function(result) {
		var extGrpObj = result['GRP-'+grpID] || (localStorage['GRP-'+grpID] ? JSON.parse(localStorage['GRP-'+grpID]) : null);
		if (!extGrpObj) return;
		
		extGrpObj.expand = state;
		
		// Save to both localStorage and chrome.storage.local
		localStorage['GRP-'+grpID] = JSON.stringify(extGrpObj);
		chrome.storage.local.set({['GRP-'+grpID]: extGrpObj});
	});
}

function makeExtRows(extList) {
	var container = document.getElementById('noGrpInner');
	var fragment = document.createDocumentFragment();
	for (var i = 0, t = extList.length; i < t; i++) {
		if (filterStrings==null || (filterStrings!=null && (extList[i].name).multiFind(filterStrings))){
			makeRow(extList[i],fragment);
		}
	}
	writeToPage(fragment,container);
}

function makeExtCatRows(extList) {
	var fragExt = document.createDocumentFragment();
	var fragApp = document.createDocumentFragment();
	var fragThm = document.createDocumentFragment();
	var extContainer = document.getElementById('extContInner');
	var appContainer = document.getElementById('appContInner');
	var thmContainer = document.getElementById('thmContInner');
			
	for (var j = 0, t = extList.length; j < t; j++) {
		if (filterStrings==null || (filterStrings!=null && (extList[j].name).multiFind(filterStrings))){
			var extType = extList[j].type;
			if(extType=="extension") makeRow(extList[j],fragExt); 
			if(extType=="theme") makeRow(extList[j],fragThm);
			if(extType.substring(extType.length-3)=="app") makeRow(extList[j],fragApp);
		}
	}
	chkEmptyPgItm(fragExt,"ext");
	chkEmptyPgItm(fragApp,"ext");
	chkEmptyPgItm(fragThm,"ext");

	writeToPage(fragExt,extContainer);
	if(!settings.showApp) {
		document.getElementById('appCont').style.display="none";
	}else{
		writeToPage(fragApp,appContainer);
	}
	if(!settings.showThm) {
		document.getElementById('thmCont').style.display="none";
	}else{
		writeToPage(fragThm,thmContainer);
	}
}

function makeGrpRows(container) {
	chrome.storage.local.get(['GRPindex'], function(result) {
		var GRPindex = result.GRPindex || (localStorage.GRPindex ? JSON.parse(localStorage.GRPindex) : []);
		var fragment = document.createDocumentFragment();
		var groupsProcessed = 0;
		
		if (GRPindex.length === 0) {
			chkEmptyPgItm(fragment, "grp");
			writeToPage(fragment, container);
			return;
		}
		
		for(var i=0, j=GRPindex.length; i<j; i++) {
			(function(index) {
				chrome.storage.local.get(['GRP-'+GRPindex[index]], function(result) {
					var extGrpObj = result['GRP-'+GRPindex[index]] || 
						(localStorage['GRP-'+GRPindex[index]] ? JSON.parse(localStorage['GRP-'+GRPindex[index]]) : null);
					
					if (extGrpObj && (filterStrings==null || (filterStrings!=null && (extGrpObj.name).multiFind(filterStrings)))) {
						makeRow(extGrpObj, fragment);
					}
					
					groupsProcessed++;
					
					// When all groups are processed, update the page
					if (groupsProcessed === GRPindex.length) {
						chkEmptyPgItm(fragment, "grp");
						writeToPage(fragment, container);
					}
				});
			})(i);
		}
	});
}

function makeAdvGrps(container) {
	chrome.management.getAll(function(extList) {
		chrome.storage.local.get(['GRPindex'], function(result) {
			var GRPindex = result.GRPindex || (localStorage.GRPindex ? JSON.parse(localStorage.GRPindex) : []);
			var fragment2 = document.createDocumentFragment();
			var groupsProcessed = 0;
			
			if (GRPindex.length === 0) {
				chkEmptyPgItm(fragment2, "grp");
				writeToPage(fragment2, container);
				return;
			}
			
			for(var i=0, j=GRPindex.length; i<j; i++) {
				(function(index) {
					chrome.storage.local.get(['GRP-'+GRPindex[index]], function(result) {
						var extGrpObj = result['GRP-'+GRPindex[index]] || 
							(localStorage['GRP-'+GRPindex[index]] ? JSON.parse(localStorage['GRP-'+GRPindex[index]]) : null);
						
						if (!extGrpObj) {
							groupsProcessed++;
							if (groupsProcessed === GRPindex.length) {
								chkEmptyPgItm(fragment2, "grp");
								writeToPage(fragment2, container);
							}
							return;
						}
						
						var fragment = document.createDocumentFragment();
						var grpId = extGrpObj.name;
						var extIDinGrp = extGrpObj.items;
						var searchHit = 0;
					
						makeRow(extGrpObj, fragment, grpId);
						
						var box = document.createElement("div");
						box.className = "grpDiv panel";
						box.id = "panel."+grpId;
						if(extGrpObj.expand){box.style.display = "block";}
						else{box.style.display = "none";}
						
						if(settings.sortMode=="1"){
							var fragOn =  fragment.cloneNode();
							var fragOff =  fragment.cloneNode();
							var fragNot =  fragment.cloneNode();
							for(var w = 0, q = extIDinGrp.length; w < q; w++){
								var found = isInstalled(extList, extIDinGrp[w]);
								if(found[0]){
									exInfo = found[1];
									if (filterStrings==null || (filterStrings!=null && (exInfo.name).multiFind(filterStrings))){
									searchHit++;
									if(exInfo.enabled){makeRow(exInfo,fragOn,grpId);}
									else{makeRow(exInfo,fragOff,grpId);}
									}
								}
								else{
									makeRow(notInstalledObj(extIDinGrp[w]),fragNot,grpId);
								}
							}
							box.appendChild(fragOn);
							box.appendChild(fragOff);
							box.appendChild(fragNot);
						}else{
							for(var w = 0, q = extIDinGrp.length; w < q; w++){
								var found = isInstalled(extList, extIDinGrp[w]);
								if(found[0]){
									exInfo = found[1];
									if (filterStrings==null || (filterStrings!=null && (exInfo.name).multiFind(filterStrings))){
									searchHit++;
									makeRow(exInfo,box,grpId);}
									found = true;
								}
								else{
									makeRow(notInstalledObj(extIDinGrp[w]),box,grpId);
								}
							}
						}
						fragment.appendChild(box);
						if (filterStrings==null || (filterStrings!=null && (extGrpObj.name).multiFind(filterStrings)) || searchHit!=0){
							packInDiv(fragment, fragment2)
						}
						
						groupsProcessed++;
						if (groupsProcessed === GRPindex.length) {
							chkEmptyPgItm(fragment2, "grp");
							writeToPage(fragment2, container);
						}
					});
				})(i);
			}
		});
	});
}

function makeSpRowsFor(rowType) {
	var prefix;
	if(rowType=="latest"){prefix = 'lat';}
	if(rowType=="lastDisabled"){prefix = 'ld';}
	var container = document.getElementById(prefix+'ContInner');
	
	// Use chrome.storage.local instead of localStorage
	chrome.storage.local.get([rowType], function(result) {
		var exIdList = result[rowType] || (localStorage.getItem(rowType) ? JSON.parse(localStorage.getItem(rowType)) : []);
		var fragment = document.createDocumentFragment();
		
		if(exIdList && exIdList.length > 0){
			for (var i = 0, t = exIdList.length; i < t; i++) {
				(function(i) {
				chrome.management.get(exIdList[i], function(extInfo){
					if(extInfo!=undefined){
						if (filterStrings==null || (filterStrings!=null && (extInfo.name).multiFind(filterStrings))){
							makeRow(extInfo,fragment);
						}
						if(i==t-1) {
							chkEmptyPgItm(fragment,"ext");
							writeToPage(fragment,container);
							document.getElementById(prefix+'Cont').style.display = 'block';
						}
					}else{
						weedQ(rowType,exIdList[i]);
						makeSpRowsFor(rowType);
					}
				});})(i);
			}
		}else{
			document.getElementById(prefix+'Cont').style.display = 'none';
		}
	});
}

function loadExtPage() {
// console.log("LOAD EXT PG");
	chrome.management.getAll(function(extList) {
		var grpUI = document.getElementById('dispGrp');
		var noGrpUI = document.getElementById('dispNoGrp');
				
		grpUI.style.display="none";
		noGrpUI.style.display="none";
		
		if(settings.showLat){
			makeSpRowsFor("latest");
		}
		if(settings.showLD){
			makeSpRowsFor("lastDisabled");
		}
		if(!settings.grpExt){
			//grpUI.style.display="none";
			noGrpUI.style.display="inline";
			
			if(!settings.showCount){
				(document.getElementById('head0')).style.display="none";
				(document.getElementById('allNo')).style.display="none";
			}
			
			if(settings.sortMode=="1"){
			extList.sort(sort_by({name:'enabled',primer:function(a){return Number(a);},reverse:true}, {name:'name',primer:function(a){return a.toUpperCase();},reverse:false}));}
			else{
			extList.sort(sort_by({name:'name',primer:function(a){return a.toUpperCase();},reverse:false}));}
		
			makeExtRows(extList);
		}
		else{
			//noGrpUI.style.display="none";
			grpUI.style.display="inline";
			
			if(settings.sortMode=="1"){
			extList.sort(sort_by({name:'type',primer:function(a){return a.substring(a.length-3).toUpperCase();},reverse:false}, {name:'enabled',primer:function(a){return Number(a);},reverse:true}, {name:'name',primer:function(a){return a.toUpperCase();},reverse:false}));}
			else{
			extList.sort(sort_by({name:'type',primer:function(a){return a.substring(a.length-3).toUpperCase();},reverse:false}, {name:'name',primer:function(a){return a.toUpperCase();},reverse:false}));}
		
			makeExtCatRows(extList);
		}
		extCount();
	});
}

function loadGrpPage() {
//console.log("LOAD GRP PG");
	var container = document.getElementById('extGroups');
	if(!settings.advGrpVw){
		makeGrpRows(container);
	}
	else{
		makeAdvGrps(container);
	}
	setGrpState();
	extGrpCount();
}

function packInDiv(contents, fragmentForDivs) {
	var box = document.createElement("div");
	box.className = "grpDiv container";
	box.appendChild(contents);
	fragmentForDivs.appendChild(box);
}

function switchTab(tabID,remainPos) {

	if(tabID=="1"){
	loadExtPage();
		document.getElementById('extList').style.display = 'inline';
		document.getElementById('extGroups').style.display = 'none';
		document.getElementById('extTab').className = "tabs tActive";
		document.getElementById('grpTab').className = "tabs";
		if(settings.tabTop){
			document.getElementById('extTab').className += " tActiveTop";
			document.getElementById('grpTab').className += " tabsTop";
		}
		settings.tabPage = tabID;
	}
	else{
	loadGrpPage();
		document.getElementById('extList').style.display = 'none';
		document.getElementById('extGroups').style.display = 'inline';
		document.getElementById('extTab').className = "tabs";
		document.getElementById('grpTab').className = "tabs tActive";
		if(settings.tabTop){
			document.getElementById('extTab').className += " tabsTop";
			document.getElementById('grpTab').className += " tActiveTop";
		}
		settings.tabPage = tabID;
	}
	
	// Save settings to both localStorage and chrome.storage.local
	localStorage.settings = JSON.stringify(settings);
	chrome.storage.local.set({settings: settings});
	
	if(typeof(remainPos)=="undefined"||!remainPos) document.body.scrollTop = 0;
}

//get parameter value of an element
function getPara(element, para) {
	var value = document.defaultView.getComputedStyle(element,null).getPropertyValue(para);
	value = value.substring(0, value.length-2);
	return value;
}

//search stuff from SimpleUndoClose
function searchFor(string) {
	string = string.replace(/(\%)/g, "%25");
	string = string.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
	string = stripVowelAccent(string);

	if ((filterStrings==null && string=="") || (filterStrings!=null && string==filterStrings.join(" "))) return;

	if (string==""){
		//pageNo=0;
		filterStrings = null;
	}else{
		//pageNo=0;
		//for(var i=0; i < filterStrings.length-1; i=i+1) { 
		string=string.toLowerCase();
		filterStrings = string.split(" "); 
	}
	clearTimeout(filterTimeOut);
	if(settings.tabPage==1) filterTimeOut=setTimeout(loadExtPage,200);
	if(settings.tabPage==2) filterTimeOut=setTimeout(loadGrpPage,200);
	
	if(settings.searchSave) localStorage.lastSearched = string;
}
function stripVowelAccent(str)
{
	var rExps=[ /[\xC0-\xC2]/g, /[\xE0-\xE2]/g,
		/[\xC8-\xCA]/g, /[\xE8-\xEB]/g,
		/[\xCC-\xCE]/g, /[\xEC-\xEE]/g,
		/[\xD2-\xD4]/g, /[\xF2-\xF4]/g,
		/[\xD9-\xDB]/g, /[\xF9-\xFB]/g ];

	var repChar=['A','a','E','e','I','i','O','o','U','u'];

	for(var i=0, j=rExps.length; i<j; ++i)
		str=str.replace(rExps[i],repChar[i]);

	return str;
}
String.prototype.multiFind = function ( strings ) {
//console.log("this-"+this);
	var str = this, i;
	str = stripVowelAccent(str);
	str = str.toLowerCase();
	var foundAmount=0;
	for (i = 0, j = strings.length; i < j; i++ ) {
	//console.log("str-"+str+"||strings[i]-"+strings[i]);
		if (str.indexOf(strings[i])!= -1) foundAmount++;
	}
	return (foundAmount==strings.length);
};
String.prototype.multiReplace = function ( strings ) {
	var str_real = this, i;
	var str = str_real;
	str = stripVowelAccent(str);
	str = str.toLowerCase();
	var position=-1;
	for (i = 0, j = strings.length; i < j; i++ ) {
		position = str.indexOf(strings[i]);
		if (position!= -1) {
			str_real = str_real.substr(0,position) + "<u>" + str_real.substr(position, strings[i].length) + "</u>" + str_real.substr(position + strings[i].length); 
			str = stripVowelAccent(str_real).toLowerCase();
		}
		//str = str.replace(new RegExp('(' + strings[i] + ')','gi'), replaceBy);
	}
	return str_real;
};

//keyboard navigation
var selRow = -1;
document.onkeydown = function(evt) {
	var extTr;
	if(settings.tabPage=="1"){
		extTr=document.getElementsByName("ext");
	}
	else{
		extTr=document.getElementsByName("extGrp");
	}

	evt = evt || window.event;
	
	//up down
	if (evt.keyCode == 38||evt.keyCode == 40) {
		evt.preventDefault();
		if (evt.keyCode == 38) { 
			if(selRow>0) selRow--;
			else selRow=(extTr.length-1);
		}
		if (evt.keyCode == 40) { 
			if(selRow<(extTr.length-1)) selRow++;
			else selRow=(0);
		}
		extTr[selRow].focus();
	}
	else if (evt.keyCode == 32||evt.keyCode == 79) {
		var divEle = extTr[selRow].childNodes;
		//space
		if (evt.keyCode == 32) {
		//console.log("space PRESS");
				evt.preventDefault();
		   if (settings.tabPage=="1") divEle[2].click();
		   if (settings.tabPage=="2") divEle[1].click();
		}
		//'o'
		if (evt.keyCode == 79&&settings.tabPage=="1") { 
		//console.log("o PRESS");
		   if(divEle[0].checked) divEle[4].click();
		}
	}
	else {
		if(document.getElementById('ovl').className == "overlay hidden") document.getElementById('searchQ').focus();
	}
};

function grpExtNotIn(extId) {
// console.log("CHK IF IN GRP "+localStorage.length);
	return new Promise((resolve) => {
		chrome.storage.local.get(['GRPindex'], function(result) {
			var GRPindex = result.GRPindex || (localStorage.GRPindex ? JSON.parse(localStorage.GRPindex) : []);
			var grpList = [];
			var groupsProcessed = 0;
			
			if (GRPindex.length === 0) {
				resolve(grpList);
				return;
			}
			
			for(var i=0, m=GRPindex.length; i<m; i++) {
				(function(index) {
					chrome.storage.local.get(['GRP-'+GRPindex[index]], function(result) {
						var extGrpObj = result['GRP-'+GRPindex[index]] || 
							(localStorage['GRP-'+GRPindex[index]] ? JSON.parse(localStorage['GRP-'+GRPindex[index]]) : null);
						
						if (extGrpObj) {
							var grpName = extGrpObj.name;
							var grpItems = extGrpObj.items;
							var inGrp = false;
							
							for (var k = 0, s = grpItems.length; k < s; k++) {
								if(grpItems[k]==extId){
									inGrp = true;
									break;
								}
							}
							if(!inGrp) grpList.push(grpName);
						}
						
						groupsProcessed++;
						if (groupsProcessed === GRPindex.length) {
							resolve(grpList);
						}
					});
				})(i);
			}
		});
	});
}

var link = document.createElement("a");
link.className = "rMenuItem";
var hr = document.createElement ("hr");

function rMenu(evt){
	//console.log(evt.target);
	evt.preventDefault();
	popHeight = getPara(document.getElementsByTagName('body')[0],"height");
	popWidth = getPara(document.getElementsByTagName('body')[0],"width");
	var menu = document.getElementById('menu');
	var evtSrc = evt.target.id;
	var posX = evt.clientX; var posY = evt.clientY;
	var w1, w1a, w2, w3, w4, rH, ngY, gap = 8;
	menu.innerHTML = "";
	document.getElementById('menu2').style.display='none';
	switch(window.navigator.language) {
		case "zh-CN":
			w1 = 121; w1a = 0; w2 = 156; w3 = 121; w4 = 168; rH = 24; ngY = rH+10;
			break;
		case "ja":
			w1 = 133; w1a = 12; w2 = 168; w3 = 121; w4 = 252; rH = 26; ngY = rH+10;
			break;
		case "ru":
			w1 = 147; w1a = 6; w2 = 166; w3 = 158; w4 = 194; rH = 24; ngY = 46;
			break;
		case "it":
			w1 = 147; w1a = 6; w2 = 217; w3 = 121; w4 = 241; rH = 24; ngY = rH+10;
			break;
		case "uk":
			w1 = 133; w1a = 6; w2 = 217; w3 = 143; w4 = 200; rH = 24; ngY = rH+10;
			break;	
		default:
			w1 = 121; w1a = 22; w2 = 217; w3 = 121; w4 = 241; rH = 24; ngY = rH+10;
	}
	if(evtSrc.substring(0,3)==="ic."||evtSrc.substring(0,3)==="na."){
		var extID = evtSrc.substring(3);
		var noOfItems = 0;
		chrome.management.get(extID, function(extInfo){
			//manage
			if(extInfo.type=="extension"){
				var element3 = link.cloneNode(false);
				element3.addEventListener("click", function(){chrome.tabs.create({url: 'chrome://extensions/?id=' + extInfo.id});});
				element3.target = "_blank";
				element3.innerHTML = chrome.i18n.getMessage("manage_menu");
				menu.appendChild(element3);
				noOfItems+=1;
			}
			//options
			if(extInfo.optionsUrl&&extInfo.enabled){
				var element4 = link.cloneNode(false);
				element4.addEventListener("click", function(){chrome.tabs.create({url: extInfo.optionsUrl})});
				element4.target = "_blank";
				element4.innerHTML = chrome.i18n.getMessage("popup_options_tooltip");
				menu.appendChild(element4);
				noOfItems+=1;
			}
			//uninstall
			var element5 = link.cloneNode(false);
			element5.addEventListener('click',function(){if(isOpera()) uninstallOvl(extInfo); else uninstallExt(extInfo.id);});
			element5.innerHTML = chrome.i18n.getMessage("popup_uninstall_tooltip");
			menu.appendChild(element5);
			noOfItems+=1;
			//grp management
			if((JSON.parse(localStorage.GRPindex)).length!=0){
				var elementA = link.cloneNode(false);
				if(extInfo.type!="theme"){
					menu.appendChild(hr.cloneNode(false));
					if(settings.tabPage==1){
						elementA.addEventListener('mouseover',function(){rMenu2(event,"add",rH,extInfo.id)});
						elementA.innerHTML = chrome.i18n.getMessage("popup_rClick_add");
						noOfItems+=1;
					}else{
						elementA.addEventListener('mouseover',function(){rMenu2(event,"mov",rH,extInfo.id,evt.target.getAttribute("grp"))});
						elementA.innerHTML = chrome.i18n.getMessage("popup_rClick_mov");
						var elementB = link.cloneNode(false);
						elementB.addEventListener('click',function(){grpOps("rem",extInfo.id,evt.target.getAttribute("grp"));});
						elementB.innerHTML = chrome.i18n.getMessage("popup_rClick_rem");
						menu.appendChild(elementB);
						w1+=w1a;
						noOfItems+=2;
					}
					menu.appendChild(elementA);
				}
			}
			
			if(posX>(popWidth-w1)){posX=(popWidth-w1)-gap;}
			if(posY>(popHeight-(noOfItems*rH+12+10+4))){posY = (popHeight - (noOfItems*rH+12+10+4));}
			rMenuShow(menu,posX,posY);
		});
	}
	else if(evtSrc==="extTab"||evtSrc==="grpTab"){
		var elementT = link.cloneNode(false);
		elementT.target = "_blank";
		if(evtSrc==="extTab"){
			if(!settings.tabTop) posY -= ngY;
			elementT.addEventListener("click", function(){chrome.tabs.create({url: "chrome://extensions"})});
			elementT.innerHTML = chrome.i18n.getMessage("popup_extSet");
			if(posX>(popWidth-w2)){posX=(popWidth-w2)-gap;}
		}
		if(evtSrc==="grpTab"){
			if(!settings.tabTop) posY -= rH+10;
			elementT.addEventListener("click", function(){chrome.tabs.create({url: "options.html#groups"})});
			elementT.innerHTML = chrome.i18n.getMessage("popup_manGrp");
			if(posX>(popWidth-w3)){posX=(popWidth-w3)-gap;}
		}
		menu.appendChild(elementT);
		rMenuShow(menu,posX,posY);
	}
	else if(settings.tabPage==1&&evt.target.className==="header"){
		var elementX = link.cloneNode(false);
		elementX.addEventListener("click", function(){newGrpOvl(1);});
		elementX.target = "_blank";
		elementX.innerHTML = chrome.i18n.getMessage("popup_rClick_new");
		menu.appendChild(elementX);
		if(posX>(popWidth-w4)){posX=(popWidth-w4)-gap;}
		rMenuShow(menu,posX,posY);
	}else if(settings.tabPage==2&&evt.target.classList.contains("header")){
		var elementX2 = link.cloneNode(false);
		elementX2.addEventListener("click", function(){removeGrp(evt.target.getAttribute("grp"));location.reload(true);});
		elementX2.target = "_blank";
		elementX2.innerHTML = chrome.i18n.getMessage("opt_egrp_delGrpBtn");
		menu.appendChild(elementX2);
		if(posX>(popWidth-w4)){posX=(popWidth-w4)-gap;}
		rMenuShow(menu,posX,posY);
	}else{ menu.style.display = 'none'; return;}
}

//group menu
function rMenu2(evt,mode,rH,extId,currGrp){
	evt.preventDefault();
	popHeight = getPara(document.getElementsByTagName('body')[0],"height");
	popWidth = getPara(document.getElementsByTagName('body')[0],"width");
	//var GRPindex = JSON.parse(localStorage.GRPindex);
	menu = document.getElementById('menu2');
	var evtSrc = evt.target.id; var mvUp = 6;
	var rect = document.getElementById('menu').getBoundingClientRect();
	var posX = rect.left; var posY = rect.bottom-34;

	menu.addEventListener('mouseleave',function(){menu.style.display='none';});
	menu.innerHTML = "";
	
	// Show loading menu
	var title = link.cloneNode(false);
	title.className = "rHeadItem";
	if(mode=="add") title.innerHTML = chrome.i18n.getMessage("popup_rClick_add") + " (Loading...)";
	else {title.innerHTML = chrome.i18n.getMessage("popup_rClick_mov") + " (Loading...)"; }
	menu.appendChild(title);
	
	rMenuShow(menu,posX,posY,(rect.right - rect.left - 6));
	
	// Get groups the extension is not in
	grpExtNotIn(extId).then(function(GRPindex) {
		var approxHeight = ((GRPindex.length+1) * rH)+12+rH+10;
		if(approxHeight>popHeight) {approxHeight=popHeight-10; mvUp+=4;}
		
		menu.innerHTML = "";
		var title = link.cloneNode(false);
		title.className = "rHeadItem";
		if(mode=="add") title.innerHTML = chrome.i18n.getMessage("popup_rClick_add");
		else {title.innerHTML = chrome.i18n.getMessage("popup_rClick_mov"); }
		menu.appendChild(title);
		menu.appendChild(hr.cloneNode(false));
		
		var elementNG = link.cloneNode(false);
		if(mode=="add") elementNG.addEventListener("click", function (){newGrpOvl(2,extId);});
		if(mode=="mov") elementNG.addEventListener("click", function (){
			chrome.storage.local.get(['GRP-'+currGrp], function(result) {
				var cgrpObj = result['GRP-'+currGrp] || (localStorage['GRP-'+currGrp] ? JSON.parse(localStorage['GRP-'+currGrp]) : null);
				if (!cgrpObj) return;
				
				var cgrpItems = cgrpObj.items;
				cgrpItems.splice(cgrpItems.indexOf(extId),1);
				
				// Save to both localStorage and chrome.storage.local
				localStorage['GRP-'+currGrp] = JSON.stringify(cgrpObj);
				chrome.storage.local.set({['GRP-'+currGrp]: cgrpObj}, function() {
					newGrpOvl(2,extId);
				});
			});
		});
		elementNG.innerHTML = chrome.i18n.getMessage("popup_rClick_ng");
		menu.appendChild(elementNG);
		
		for (var i = 0, j = GRPindex.length; i < j; i++) {
			(function(grpName) {
				var elementS = link.cloneNode(false);
				elementS.addEventListener("click", function (){grpOps(mode, extId, grpName, currGrp);});
				elementS.innerHTML = grpName;
				menu.appendChild(elementS);
			})(GRPindex[i]);
		}
		
		if((popHeight-(rect.bottom-rH-4))<approxHeight) posY = popHeight - approxHeight - mvUp;
		if(approxHeight>popHeight) posY-=4;
		rMenuShow(menu,posX,posY,(rect.right - rect.left - 6));
	});
}

function rMenuShow(menu,posX,posY,wAdj){
	menu.style.position = 'absolute';
	menu.style.display = 'block';
	menu.style.left = posX + 'px';
	menu.style.top = posY + 'px';
	menu.style.maxHeight = (document.body.clientHeight-10) + 'px';
	if(wAdj!==undefined) {menu.style.width = wAdj + 'px';} else {menu.style.width = 'auto';}
}

function rMenuHide() {
	if (document.getElementById('menu').style.display == "block") {document.getElementById('menu').style.display='none';document.getElementById('menu2').style.display='none';}
};

function grpOps(mode, extId, grpId, currGrpId){
    chrome.storage.local.get(['GRP-'+grpId], function(result) {
        var grpObj = result['GRP-'+grpId] || (localStorage['GRP-'+grpId] ? JSON.parse(localStorage['GRP-'+grpId]) : null);
        if (!grpObj) return;
        
        var grpItems = grpObj.items;
        
        if(mode=="add"){
            if(grpItems.indexOf(extId)==-1) grpItems.push(extId);
            if(settings.showGrp) location.reload(true);
        }
        else if(mode=="mov"){
            chrome.storage.local.get(['GRP-'+currGrpId], function(result) {
                var cgrpObj = result['GRP-'+currGrpId] || (localStorage['GRP-'+currGrpId] ? JSON.parse(localStorage['GRP-'+currGrpId]) : null);
                if (!cgrpObj) return;
                
                var cgrpItems = cgrpObj.items;
                cgrpItems.splice(cgrpItems.indexOf(extId),1);
                
                // Save to both localStorage and chrome.storage.local
                localStorage['GRP-'+currGrpId] = JSON.stringify(cgrpObj);
                chrome.storage.local.set({['GRP-'+currGrpId]: cgrpObj}, function() {
                    if(grpItems.indexOf(extId)==-1) grpItems.push(extId);
                    
                    sortGrpItems(grpItems, function(sortedItems){
                        grpObj.items = sortedItems;
                        
                        // Save to both localStorage and chrome.storage.local
                        localStorage['GRP-'+grpId] = JSON.stringify(grpObj);
                        chrome.storage.local.set({['GRP-'+grpId]: grpObj}, function() {
                            loadGrpPage();
                        });
                    });
                });
            });
            return; // Return early since we're handling the save in the callback
        }
        else if(mode=="rem"){
            grpItems.splice(grpItems.indexOf(extId),1);
        }
        
        sortGrpItems(grpItems, function(sortedItems){
            grpObj.items = sortedItems;
            
            // Save to both localStorage and chrome.storage.local
            localStorage['GRP-'+grpId] = JSON.stringify(grpObj);
            chrome.storage.local.set({['GRP-'+grpId]: grpObj}, function() {
                loadGrpPage();
            });
        });
    });
}

chrome.management.onDisabled.addListener(function(extInfo){
	if(settings.tabPage==1&&settings.showLD) {clearTimeout(reloadTimeOut);
	reloadTimeOut=setTimeout(function(){makeSpRowsFor("lastDisabled")},200);}
});
chrome.management.onEnabled.addListener(function(extInfo){
	if(settings.tabPage==1&&settings.showLD) {clearTimeout(reloadTimeOut);
	reloadTimeOut=setTimeout(function(){makeSpRowsFor("lastDisabled")},200);}
});

//from https://stackoverflow.com/questions/558614/reorder-divs
function swapSibling(node1, node2) {
	node1.parentNode.insertBefore(node2, node1); 
}

//start here
document.addEventListener('DOMContentLoaded', function () {
	// The initialization logic is now moved to the initializeUI function
	// which is called after the settings are loaded from chrome.storage.local
});

// Function to initialize the UI after settings are loaded
function initializeUI() {
	if(settings.tabTop) swapSibling(document.getElementById('top'), document.getElementById('bottom'));
	if(settings.searchTop) swapSibling(document.getElementById('top'), document.getElementById('bar'));

	//popup width
	var body=document.getElementsByTagName('body')[0];
	if(settings.rightClickDel) body.addEventListener('contextmenu',function(){rMenu(event);});
	//var itmCount = [settings.showGrp,settings.showSet,settings.showDel].filter(v => v).length;
	var itmCount = [settings.showGrp,settings.showSet,settings.showDel].filter(function(v) {return v}).length;
	if(!settings.showChk){
		if(itmCount==1) body.className="oneItem";
		if(itmCount==2) body.className="twoItem";
		if(itmCount==3) body.className="threeItem";
		if(itmCount==0) body.className="noItem";
	}
	if(settings.showChk){
		if(itmCount==3) body.className="fourItem";
		if(itmCount==1) body.className="twoItem";
		if(itmCount==0) body.className="oneItem";
	}
	
	//popup height
	var zoomLvl = window.devicePixelRatio;
	var query = "(-webkit-min-device-pixel-ratio: 2), (min-device-pixel-ratio: 2), (min-resolution: 192dpi)";
	if (matchMedia(query).matches) {
		zoomLvl = zoomLvl/2;
	}
	var allowedH = 600; //max popup height is 600px as set by Google
	if(settings.showSearch||settings.showDis) allowedH -= 28;
	if(settings.showStore) allowedH -= 23;
	if(settings.showTab) allowedH -= 34;
	if(zoomLvl!=1) allowedH-=(allowedH*(zoomLvl-1));
	document.getElementById('top').style.maxHeight = allowedH+"px";
	
	//search bar area
	var searchBar = document.getElementById('searchQ');
	var disableBtn = document.getElementById('disableAll');
	if(!settings.showSearch&&settings.showDis){disableBtn.style.width=(getPara(body,"width")-2)+"px";}
	if(!settings.showSearch) searchholder.style.display = 'none';
	if(!settings.showDis) disholder.style.display = 'none';
	if(!settings.showSearch&&!settings.showDis){ 
		document.getElementById('bar').style.display = 'none';
	}else{
		document.getElementById('bar').style.display = 'table';
		if(!settings.tabTop) {document.getElementById('bottom').style.paddingTop = '2px';}
		else {document.getElementById('bottom').style.paddingBottom = '2px';}
	}
	
	if(!settings.showTab) {
		document.getElementById('bottom').style.display = 'none';
		if(settings.showSearch||settings.showDis) document.getElementById('storeGrp').style.paddingTop = '2px';
	}
	if(!settings.showStore) document.getElementById('storeGrp').style.display = 'none';
	
	switchTab(settings.tabPage);
	
	document.getElementById('extTab').addEventListener('click',function(){switchTab("1");});
	document.getElementById('grpTab').addEventListener('click',function(){switchTab("2");});
	
	//search bar actions
	if(settings.searchSave && localStorage.lastSearched!=undefined) {document.getElementById('searchQ').value = localStorage.lastSearched; searchFor(localStorage.lastSearched);}
	else if(!settings.searchSave && localStorage.lastSearched!=undefined) {localStorage.removeItem("lastSearched");}
	document.getElementById('searchQ').addEventListener('input',function(){
	 searchFor(document.getElementById('searchQ').value);
	});
	
	//enable/disable
	var state = "disabledState";
	btnSetter(state);
	document.getElementById('disableAll').addEventListener('click',function(){disableAllHandler(state);location.reload(true);});
	
	document.getElementById('head0').innerHTML = chrome.i18n.getMessage("popup_header1");
	document.getElementById('head1').innerHTML = chrome.i18n.getMessage("popup_header1");
	document.getElementById('head2').innerHTML = chrome.i18n.getMessage("popup_header2");
	document.getElementById('head3').innerHTML = chrome.i18n.getMessage("popup_header3");
	document.getElementById('headL').innerHTML = chrome.i18n.getMessage("popup_headerL");
	document.getElementById('headLD').innerHTML = chrome.i18n.getMessage("popup_headerLD");
	document.getElementById('grp1').innerHTML = chrome.i18n.getMessage("popup_header1");
	document.getElementById('grp2').innerHTML = chrome.i18n.getMessage("popup_tab2");
	document.getElementById('storeLnk').innerHTML = chrome.i18n.getMessage("popup_store");
	linkSwitcher(document.getElementById('storeLnk'));
	document.getElementById('searchQ').title = chrome.i18n.getMessage("popup_search_tooltip");
	
	document.onclick = rMenuHide;
	document.getElementById('top').onmousewheel = function(e){if(e.wheelDelta!=0)rMenuHide();};
	document.getElementById('menu2').onmousewheel = function(e){e.stopPropagation();};
	
}