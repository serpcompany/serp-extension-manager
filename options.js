var settings = {};

function populateExtList(grpName) {
	var listOfExt = document.getElementById('sub-extgrp-list');
	chrome.management.getAll(function(extList) {
		extList.sort(sort_by({name:'name',primer:function(a){return a.toUpperCase();},reverse:false}));

		var fragment = document.createDocumentFragment();
		
		if(grpName===""){
		//console.log("NEW");
			for (var k = 0, v = extList.length; k < v; k++) {
				if(extList[k].id!=selfId) makeRow(extList[k],fragment,false);
			}
		}
		else{
		//console.log("EDIT");
			var extGrpObj = JSON.parse(localStorage["GRP-"+grpName]);
			var grpItems = extGrpObj.items;
			
			document.getElementById('grpName').value = extGrpObj.name;
			
			//chk and make rows for not installed items
			for (var p = 0, d = grpItems.length; p < d; p++){
				var found = isInstalled(extList, grpItems[p]);
				if(!found[0]){
					makeRow(notInstalledObj(grpItems[p]),fragment,true);
				}
			}
			
			for (var i = 0, q = extList.length; i < q; i++){
				if(extList[i].id!=selfId){
					var itemInGrp = false; //is ext in grp installed?
					for (var j = 0, w = grpItems.length; j < w; j++){
						if(extList[i].id==grpItems[j]) itemInGrp = true;
					}
					makeRow(extList[i],fragment,itemInGrp);
				}
			}
		}
		
		listOfExt.innerHTML = "";
		listOfExt.appendChild(fragment);
	});
}

function closeOverlay() {
	document.getElementById('ovl').className = "overlay hidden";
	document.getElementById('grpName').className = "";
}
function showOverlay(mode,grpName) {
	document.getElementById('grpName').value = "";
	populateExtList(grpName);
	var boxTitle = document.getElementById('ovBoxTitle');
	var saveBtn = document.getElementById('savGrpButton');
	var saveBtnN = document.getElementById('savNGrpButton');
	if(mode=="new") {showOverlayContent("group"); boxTitle.textContent = chrome.i18n.getMessage("opt_egrp_floatTitle1"); saveBtn.name=""; saveBtn.setAttribute("hidden",""); saveBtnN.removeAttribute("hidden",""); saveBtnN.style.marginRight="24px";}
	if(mode=="edit") {showOverlayContent("group"); boxTitle.textContent = chrome.i18n.getMessage("opt_egrp_floatTitle2"); saveBtn.name=grpName; saveBtn.removeAttribute("hidden",""); saveBtnN.removeAttribute("hidden"); saveBtnN.style.marginRight="8px";}
	if(mode=="bak") {showOverlayContent("backup"); boxTitle.textContent = chrome.i18n.getMessage("opt_egrp_floatTitle1"); saveBtn.name=""; saveBtn.setAttribute("hidden",""); saveBtnN.setAttribute("hidden","");}
	document.getElementById('sub-extgrp-list').scrollTop = 0;
	document.getElementById('ovl').className = "overlay visible";
}
function showOverlayContent(name) {
	if(name=="group") {document.getElementById('bakImp').setAttribute("hidden",""); document.getElementById('grping').removeAttribute("hidden"); resizeExtGrpList();}
	if(name=="backup") {document.getElementById('grping').setAttribute("hidden",""); document.getElementById('bakImp').removeAttribute("hidden");}
}

function delExtGrp(extGrpID) {
//console.log("DEL- "+extGrpID);
	 removeGrp(extGrpID);
	 loadExtGrpList();
}

function loadExtGrpList() {
//console.log("LOAD MAIN LIST");
	var listOfExt = document.getElementById('main-extgrp-list');
	var detailBtn = document.getElementById('grpDetail');

	var fragment = document.createDocumentFragment();
	var GRPindex = JSON.parse(localStorage.GRPindex);
	for(var i=0,m=GRPindex.length; i<m; i++) {
		var extGrpObj = JSON.parse(localStorage["GRP-"+GRPindex[i]]);
		makeRow(extGrpObj,fragment,extGrpObj.enabled);
	}
	listOfExt.innerHTML = "";
	listOfExt.appendChild(fragment);
	
	if(listOfExt.childNodes.length!=0){
		listOfExt.removeAttribute("hidden","");
		detailBtn.removeAttribute("hidden","");
		document.getElementById('backupButton').disabled = false;
	}else{
		listOfExt.setAttribute("hidden","");
		detailBtn.setAttribute("hidden","");
		document.getElementById('backupButton').disabled = true;
	}
	menuCreate();
}

function makeRow(extInfo,fragment,rowState) {
//console.log("MAKE ROW");
	var settings = JSON.parse(localStorage.settings);
	var extType = extInfo.type;
	
	if(extType!="theme"&&!(extType.substring(extType.length-3)=="app"&&!settings.showApp)){

		var row = document.createElement("div");
		row.id = extInfo.id;
		if(extType=="extGrp"){
			row.className = "ext mainGrp";
		}else{
			row.className = "ext";
			if(extInfo.installType=="development") {row.className += " dev";}
		}
		row.setAttribute("name","ext");
		row.setAttribute("tabindex","-1");
		var image = document.createElement("img");
		image.className = "pImg";

		if(extType!="extGrp"){
		//checkbox
			var element1 = document.createElement("input");
			element1.className = "cellEnabler";
			if(extType!="extension"&&extType!="extGrp"&&extType!="not_installed") element1.className += " appChk";
			if(extType!="extGrp") element1.setAttribute("name","enabler");
			element1.id = "ch."+extInfo.id;
			element1.type = "checkbox";
			//if(extType=="extGrp") element1.addEventListener('click',function(){enableGrp(extInfo.id,false);});
			element1.checked = rowState;
			row.appendChild(element1);

		
		//icon
			var element2a = image.cloneNode(true);
			element2a.id = "ic."+extInfo.id;
			element2a.width = 16;
			element2a.height = 16;
			element2a.src = getIconURL(extInfo,0);
			row.appendChild(element2a);
		}
		
		//name
		var element3 = document.createElement("div");
		var element3a = document.createElement("span");
		element3.setAttribute("name","namae");
		element3.className = "cellName";
		element3.id = "na."+extInfo.id;
		element3.addEventListener('click',function(){document.getElementById("ch."+extInfo.id).click();});
		element3a.className = "buttonText";
		if(extType=="extGrp") {
			element3a.className += " mGrpTxt";
			//if(!rowState) element3.className += " disabled";
		}
		if(extType!="extGrp") {
			element3a.className += " sGrpTxt";
			if(extType!="not_installed") element3.title = "[ "+extInfo.version+" | "+extInfo.installType+" "+extInfo.type+" ]\n"+extInfo.description;
		}
		element3a.textContent = extInfo.name;
		element3.appendChild(element3a);
		row.appendChild(element3);
		
		//if grouped
		if(extType!="extGrp"){
			var grouped = isInGrp(extInfo.id);
			var match = /\r|\n/.exec(grouped);
			if(match){
				var element4 = document.createElement("span");
				element4.className = "righted";
				element4.textContent = "GROUPED";
				element4.title = grouped;
				row.appendChild(element4);
			}
		}
		
		if(extType=="extGrp"){
			var elementG2 = document.createElement("button");
			elementG2.className = "egButton";
			elementG2.id = "de."+extInfo.id;
			elementG2.addEventListener('click', function(e){e.preventDefault();delExtGrp(extInfo.id);});
			elementG2.textContent = chrome.i18n.getMessage("opt_egrp_delGrpBtn");
			row.appendChild(elementG2);
			
			var elementG1 = document.createElement("button");
			elementG1.className = "egButton";
			elementG1.id = "ed."+extInfo.id;
			elementG1.addEventListener('click', function(e){e.preventDefault();showOverlay("edit",extInfo.name);});
			elementG1.textContent = chrome.i18n.getMessage("opt_egrp_editGrpBtn");
			row.appendChild(elementG1);
			
			var elementP2 = document.createElement("button");
			elementP2.className = "egButton";
			elementP2.addEventListener('click', function(e){e.preventDefault();reorderGrp("down",extInfo.name);});
			elementP2.textContent = "▼";
			row.appendChild(elementP2);
			
			var elementP1 = document.createElement("button");
			elementP1.className = "egButton";
			elementP1.addEventListener('click', function(e){e.preventDefault();reorderGrp("up",extInfo.name);});
			elementP1.textContent = "▲";
			row.appendChild(elementP1);
		}
		
		fragment.appendChild(row);
	}

}

function getRadioValue(radioGroup){
	var rGrp = document.getElementsByName(radioGroup);
    for (var i = 0, r = rGrp.length; i < r; i++)
    {
        if (rGrp[i].checked)
        {
            return rGrp[i].value;
        }
    }
}

function noContextHandler() {
	save();
	if(document.getElementById('noContext').checked) { 
		chrome.contextMenus.removeAll();
	}
	else {
		menuCreate();
	}
}

function save() {
	settings = JSON.parse(localStorage.settings);

	settings.grpExt = document.getElementById('grpExt').checked;
	settings.showChk = document.getElementById('showChk').checked;
	settings.showGrp = document.getElementById('showGrp').checked;
	settings.showSet = document.getElementById('showSet').checked;
	settings.showDel = document.getElementById('showDel').checked;
	settings.showApp = document.getElementById('showApp').checked;
	settings.showThm = document.getElementById('showThm').checked;
	settings.showLat = document.getElementById('showLat').checked;
	settings.showLD = document.getElementById('showLD').checked;
	settings.showCount = document.getElementById('showCount').checked;
	settings.showSearch = document.getElementById('showSearch').checked;
	settings.showDis = document.getElementById('showDis').checked;
	settings.showTab = document.getElementById('showTab').checked;
	settings.showStore = document.getElementById('showStore').checked;
	settings.showP = document.getElementById('showP').checked;
	settings.altBut = document.getElementById('altBut').checked;
	settings.launchApp = document.getElementById('launchApp').checked;
	settings.searchSave = document.getElementById('searchSave').checked;
	settings.rightClickDel = document.getElementById('rightClickDel').checked;
	settings.advGrpVw = document.getElementById('advGrpVw').checked;
	settings.noContext = document.getElementById('noContext').checked;
	settings.searchTop = document.getElementById('searchTop').checked;
	settings.tabTop = document.getElementById('tabTop').checked;
	settings.onlyOne = document.getElementById('onlyOne').checked;
	
	settings.sortMode = getRadioValue('sort');
	settings.theme = getRadioValue('theme');
	settings.importMode = getRadioValue('import');

	localStorage.settings = JSON.stringify(settings);
	updateIcon();
}

// Make sure the options gets properly initialized from the
// saved preference.
document.addEventListener('DOMContentLoaded', function () {
	settings = JSON.parse(localStorage.settings);

	document.getElementById('grpExt').checked = settings.grpExt;
	document.getElementById('grpExt').addEventListener('click', save);

	document.getElementById('showChk').checked = settings.showChk;
	document.getElementById('showChk').addEventListener('click', save);
	
	document.getElementById('showGrp').checked = settings.showGrp;
	document.getElementById('showGrp').addEventListener('click', save);

	document.getElementById('showSet').checked = settings.showSet;
	document.getElementById('showSet').addEventListener('click', save);

	document.getElementById('showDel').checked = settings.showDel;
	document.getElementById('showDel').addEventListener('click', save);

	document.getElementById('showApp').checked = settings.showApp;
	document.getElementById('showApp').addEventListener('click', save);

	document.getElementById('showThm').checked = settings.showThm;
	document.getElementById('showThm').addEventListener('click', save);
	
	document.getElementById('showLat').checked = settings.showLat;
	document.getElementById('showLat').addEventListener('click', save);
	
	document.getElementById('showLD').checked = settings.showLD;
	document.getElementById('showLD').addEventListener('click', save);
	
	document.getElementById('showCount').checked = settings.showCount;
	document.getElementById('showCount').addEventListener('click', save);
	
	document.getElementById('showSearch').checked = settings.showSearch;
	document.getElementById('showSearch').addEventListener('click', save);
	document.getElementById('searchTop').checked = settings.searchTop;
	document.getElementById('searchTop').addEventListener('click', save);
	
	document.getElementById('showDis').checked = settings.showDis;
	document.getElementById('showDis').addEventListener('click', save);
	
	document.getElementById('showTab').checked = settings.showTab;
	document.getElementById('showTab').addEventListener('click', save);
	document.getElementById('tabTop').checked = settings.tabTop;
	document.getElementById('tabTop').addEventListener('click', save);
	
	document.getElementById('showStore').checked = settings.showStore;
	document.getElementById('showStore').addEventListener('click', save);
	
	document.getElementById('showP').checked = settings.showP;
	document.getElementById('showP').addEventListener('click', save);
	
	document.getElementById('altBut').checked = settings.altBut;
	document.getElementById('altBut').addEventListener('click', save);
	
	document.getElementById('launchApp').checked = settings.launchApp;
	document.getElementById('launchApp').addEventListener('click', save);
	document.getElementById('searchSave').checked = settings.searchSave;
	document.getElementById('searchSave').addEventListener('click', save);
	document.getElementById('rightClickDel').checked = settings.rightClickDel;
	document.getElementById('rightClickDel').addEventListener('click', save);
	document.getElementById('advGrpVw').checked = settings.advGrpVw;
	document.getElementById('advGrpVw').addEventListener('click', save);
	
	document.getElementById('noContext').checked = settings.noContext;
	document.getElementById('noContext').addEventListener('click', noContextHandler);
	document.getElementById('onlyOne').checked = settings.onlyOne;
	document.getElementById('onlyOne').addEventListener('click', save);
	
	document.getElementById('sort'+settings.sortMode).checked = true;
	document.getElementById('sort1').addEventListener('click', save);
	document.getElementById('sort2').addEventListener('click', save);
	
	// Make sure the theme elements exist before setting checked
	var themeElement = document.getElementById('theme'+settings.theme);
	if (themeElement) {
		themeElement.checked = true;
	}
	
	document.getElementById('theme1').addEventListener('click', function(){save();location.reload();});
	document.getElementById('theme2').addEventListener('click', function(){save();location.reload();});
	document.getElementById('theme3').addEventListener('click', function(){save();location.reload();});
	
	document.getElementById('newGrpButton').addEventListener('click', function(e){
		e.preventDefault();
		showOverlay("new","");
	});
	document.getElementById('bakImpButton').addEventListener('click', function(e){
		e.preventDefault();
		showOverlay("bak","");
	});
	document.getElementById('closeOver').addEventListener('click', closeOverlay);
	document.getElementById('closeOver2').addEventListener('click', function(e) {closeOverlay(); document.getElementById('drop_zone').innerHTML = chrome.i18n.getMessage("opt_bigp_dropz");});
	document.getElementById('savGrpButton').addEventListener('click', function(){saveExtGrp(1,true);});
	document.getElementById('savNGrpButton').addEventListener('click', function(){saveExtGrp(2,true);});
	
	document.getElementById('backupButton').addEventListener('click', downloadFile);
	document.getElementById('import'+settings.importMode).checked = true;
	document.getElementById('import1').addEventListener('click', save);
	document.getElementById('import2').addEventListener('click', save);
	document.getElementById('drop_zone').addEventListener('click', function() {triggerClick(document.getElementById('files'));}, false);
	document.getElementById('drop_zone').addEventListener('dragover', handleDragOver, false);
	document.getElementById('drop_zone').addEventListener('drop', handleDropSelect, false);
	document.getElementById('files').addEventListener('change', handleFileSelect, false);
	
	document.getElementById('grpDetail').addEventListener('click', function(){popupwindow("details.html","Blank",300,600);});

	document.getElementById('resetButton').addEventListener('click', clearMemory);
	
	window.addEventListener('resize', resizeExtGrpListChk, true);
	
	forOpera();
	
	loadExtGrpList();
});

// no Opera apps so disable
function forOpera() {
	if(isOpera()) { 
		document.getElementById('showAppCont').style.display = 'none';
		document.getElementById('showThmCont').style.display = 'none';
		document.getElementById('launchAppCont').style.display = 'none';
		document.getElementById('grpListCont').style.display = 'none';
	}
}

function resetData() {	
	var oldUpdTill = localStorage.updatedTill;
	localStorage.clear();
	localStorage.settings = JSON.stringify(defaultSettings);
	localStorage.setItem("latest",JSON.stringify([]));
	localStorage.setItem("lastDisabled",JSON.stringify([]));
	localStorage.setItem("GRPindex",JSON.stringify([]));
	localStorage.updatedTill = oldUpdTill;
	location.reload(true);
}

function clearMemory(){
	var sure=confirm(chrome.i18n.getMessage("opt_resetbtn_popupMsg"));
	if (sure==true) resetData();
}

function popupwindow(url, title, w, h) {
	wLeft = window.screenLeft ? window.screenLeft : window.screenX;
	wTop = window.screenTop ? window.screenTop : window.screenY;

	var left = wLeft + (window.innerWidth / 2) - (w / 2);
	var top = wTop + (window.innerHeight / 2) - (h / 2);
	window.open(url, title, 'toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=' + w + ', height=' + h + ', top=' + top + ', left=' + left + ', screenX=' + left + ', screenY=' + top);
}

function reorderGrp(move,grpName){
	var GRPindex = JSON.parse(localStorage.GRPindex);
	var actPos = GRPindex.indexOf(grpName);
	var switchPos, waiting;
	if(move=="up"){
		if(actPos==0){switchPos = GRPindex.length-1;}
		else{switchPos = actPos-1;}
	}
	else if(move=="down"){
		if(actPos==GRPindex.length-1){switchPos = 0;}
		else{switchPos = actPos+1;}
	}
	waiting = GRPindex[switchPos];
	GRPindex[switchPos] = GRPindex[actPos];
	GRPindex[actPos] = waiting;
	localStorage.setItem("GRPindex",JSON.stringify(GRPindex));
	loadExtGrpList();
}

//Here on is backup/import stuff

//to covert special characters to XML compatible
//https://stackoverflow.com/questions/1787322/htmlspecialchars-equivalent-in-javascript/4835406#4835406
function escapeHtml(text) {
  return text
      .replace(/&/g, "&amp;");
}
function captureHtml(text) {
  return text
      .replace(/&amp;/g, "&");
}

function exportGrps() {
	var GRPindex = JSON.parse(localStorage.GRPindex);
	var content="<ExtGrpBakV2>";
	for (var i = 0, w = GRPindex.length; i < w; i++){
		content+="<group><key>GRP-"+escapeHtml(GRPindex[i])+"</key><val>"+escapeHtml(localStorage["GRP-"+GRPindex[i]])+"</val></group>";
	}	
	content+="</ExtGrpBakV2>";	
	//console.log(content);
	return content;
}

function importGrps(xml){
	var groups = xml.getElementsByTagName("group");
	var noOfImpGrps = groups.length;
	
	function processAddEnableGrp(extGrp,GRPindex){
		var processedGrp = spliceSelf(extGrp);
		addGrp(processedGrp,GRPindex);
		enableGrp(processedGrp.id,true);
	}
	
	//overwrite
	if(settings.importMode=="1"||localStorage.length==0){
	//console.log("OV");
		var oldUpdTill = localStorage.updatedTill;
		var setting_bak = JSON.parse(localStorage.settings);
		var latest_bak = JSON.parse(localStorage.latest);
		var lastDisabled_bak = JSON.parse(localStorage.lastDisabled);
		localStorage.clear();
		localStorage.settings = JSON.stringify(setting_bak);
		localStorage.latest = JSON.stringify(latest_bak);
		localStorage.lastDisabled = JSON.stringify(lastDisabled_bak);
		localStorage.updatedTill = oldUpdTill;
		localStorage.setItem("GRPindex",JSON.stringify([])); 
		var GRPindex = JSON.parse(localStorage.GRPindex);
		
		if(xml.getElementsByTagName("ExtGrpBakV2").length!=0){
			for(var i = 0; i < noOfImpGrps; i++){
				var gCont = captureHtml(groups[i].childNodes[1].innerHTML);
				console.log(gCont);
				processAddEnableGrp(JSON.parse(gCont),GRPindex);
			}
		}else{
			for(var i = 0; i < noOfImpGrps; i++){
				// var gName = groups[i].childNodes[0].innerHTML;
				var gCont = captureHtml(groups[i].childNodes[1].innerHTML);
				var gContObj = JSON.parse(gCont);
				var grpItems = gContObj.items.split("|");
				var grpObj = {"name":gContObj.name,"id":gContObj.id,"type":"extGrp","enabled":gContObj.enabled,"items":grpItems};
				processAddEnableGrp(grpObj,GRPindex);
			}
		}
	}
	//merge
	else{
	//console.log("M");
		//merge home and away to 1 2d array
		var GRPindex = JSON.parse(localStorage.GRPindex);
		var totalSize = GRPindex.length + noOfImpGrps;
		var allGrps = new Array(totalSize);
		for (var i = 0; i < totalSize; i++) {
			allGrps[i] = new Array(2);
		}
		if(xml.getElementsByTagName("ExtGrpBakV2").length!=0){
			for(var i = 0; i < noOfImpGrps; i++){
				allGrps[i][0]=captureHtml(groups[i].childNodes[0].innerHTML);
				allGrps[i][1]=JSON.parse(captureHtml(groups[i].childNodes[1].innerHTML));
			}
		}else{
			for(var i = 0; i < noOfImpGrps; i++){
				allGrps[i][0]=captureHtml(groups[i].childNodes[0].innerHTML);
				var gContObj =JSON.parse(captureHtml(groups[i].childNodes[1].innerHTML));
				var grpItems = gContObj.items.split("|");
				var grpObj = {"name":gContObj.name,"id":gContObj.id,"type":"extGrp","enabled":gContObj.enabled,"items":grpItems};
				allGrps[i][1]=grpObj;
			}
		}
		for(var i = 0, j = noOfImpGrps; i < GRPindex.length; i++){
			var hKey = "GRP-"+GRPindex[i];
			allGrps[j][0]=hKey;
			allGrps[j][1]=JSON.parse(localStorage[hKey]);
			j++;
		}
		//sort
		allGrps.sort(sortFunction);
		function sortFunction(a, b) {
			return a[0] > b[0];
		}
		//TEST LOOP
		// for (var i = 0; i < totalSize; i++) {
			// console.log(allGrps[i][0]);
		// }
		//the bulk
		for (var i = 0; i < totalSize; i++) {
			// console.log(totalSize+":: grp "+i+" VS grp"+(i+1));
				var g1 = allGrps[i][0];
				var g2;
				if((i+1)<totalSize){g2 = allGrps[i+1][0];}
				else{g2 = g1;}
				
				// console.log(g1+" vs "+g2);
				//if got same grp name, all items to 1 list, sort etc
				if(g1==g2){
					var g11 = allGrps[i][1];
					var g21;
					if((i+1)<totalSize){g21 = allGrps[i+1][1];}
					else{g21 = g11;}
					var g1Items = g11.items;
					var g2Items = g21.items;

					var totalSize2 = g1Items.length + g2Items.length;
					var allItems = new Array(totalSize2);
					for(var w = 0; w < g1Items.length; w++){
					// console.log("A:slot "+w+" of "+totalSize2+" | item "+w+" of "+g1Items.length+" - "+g1Items[w]);
						allItems[w]=g1Items[w];
					}
					for(var v = 0, j = g1Items.length; v < g2Items.length; v++){
					// console.log("B:slot "+j+" of "+totalSize2+" | item "+v+" of "+g2Items.length+" - "+g2Items[v]);
						allItems[j]=g2Items[v];
						j++
					}
					allItems.sort();
					////TEST LOOP
					// for (var b = 0; b < totalSize2; b++) {
						// console.log(allItems[b]+"\n");
					// }
					////Combine LOOP
					var res = [];
					for (var q = 0; q < totalSize2; q++) {
						res.push(allItems[q]);
						if(allItems[q]==allItems[q+1]){
							q++;
						}
					}
					// console.log("res++ "+res);
					if(["latest","settings","updatedTill"].indexOf(g2)==-1){
						var grpObj = {"name":g21.name,"id":g21.id,"type":"extGrp","enabled":g21.enabled,"items":res};
						processAddEnableGrp(grpObj,GRPindex);
					}
					i++;
				}
				else{
					if(["latest","settings","updatedTill"].indexOf(g1)==-1){
					// chrome.extension.getBackgroundPage().console.log("> add "+(allGrps[i][1]).id);
						processAddEnableGrp(allGrps[i][1],GRPindex);
					}
				}
		}
		//TEST LOOP
		// for (var i = 0; i < totalSize; i++) {
			// console.log(allGrps[i][0]+"**"+allGrps[i][1]);
		// }
	}
	alert(chrome.i18n.getMessage("opt_bigp_idone"));
	location.reload(true);
	document.getElementById('drop_zone').innerHTML = chrome.i18n.getMessage("opt_bigp_dropz");
}

//modified from http://html5-demos.appspot.com/static/a.download.html

var cleanUp = function(a) {
  a.textContent = 'Downloaded';
  a.dataset.disabled = true;

  // Need a small delay for the revokeObjectURL to work properly.
  setTimeout(function() {
    window.URL.revokeObjectURL(a.href);
  }, 1500);
};

var downloadFile = function() {
	var output = document.getElementById('linkCont');
	const MIME_TYPE = 'text/plain';
	window.URL = window.URL;

	var prevLink = output.querySelector('a');
	if (prevLink) {
		window.URL.revokeObjectURL(prevLink.href);
		output.innerHTML = '';
	}

	var bb = new Blob([exportGrps()], {type: MIME_TYPE});

	var a = document.createElement('a');
	a.download = "extensionGroups.backup"; //filename
	a.href = window.URL.createObjectURL(bb);
	a.textContent = 'Download ready';

	a.dataset.downloadurl = [MIME_TYPE, a.download, a.href].join(':');

	output.appendChild(a);

	a.onclick = function(e) {
		if ('disabled' in this.dataset) {
		  return false;
		}

		cleanUp(this);
	};
	
	//auto-click link
	triggerClick(a);
};

//modified from http://www.html5rocks.com/en/tutorials/file/dndfiles/

function handleFileSelect(evt) {
	var file = evt.target.files[0]; // FileList object
	afterSelect(file);
}

function handleDropSelect(evt) {
	evt.stopPropagation();
    evt.preventDefault();
	var file = evt.dataTransfer.files[0]; // FileList object
	afterSelect(file);
}

function afterSelect(file){
	if(file){
		document.getElementById('drop_zone').innerHTML = file.name+" "+chrome.i18n.getMessage("opt_bigp_iload");
		
		var reader = new FileReader();
		reader.onload = function(e) {
		  var text = reader.result;
		  var xml = textToXML(text);
		  
		  //validate file first
		  if(xml!=null){
			  if(xml.getElementsByTagName("ExtGrpBak")||xml.getElementsByTagName("ExtGrpBakV2")){
				//console.log("File Pass");
				var ask=confirm(chrome.i18n.getMessage("opt_bigp_iconf"));
				if(ask==true){
					importGrps(xml);
				}
				else{
					triggerClick(document.getElementById('closeOver2'));
				}
			  }
			  else{
				//console.log("File FAIL1");
				alert(chrome.i18n.getMessage("opt_bigp_ierrr"));
				document.getElementById('drop_zone').innerHTML = chrome.i18n.getMessage("opt_bigp_dropz");
			  }
		  }
		  else{
			//console.log("File FAIL2");
			alert(chrome.i18n.getMessage("opt_bigp_ierrr"));
			document.getElementById('drop_zone').innerHTML = chrome.i18n.getMessage("opt_bigp_dropz");
		  }
		}
		reader.readAsText(file);
	}
	else{
		document.getElementById('drop_zone').innerHTML = chrome.i18n.getMessage("opt_bigp_dropz");
	}
}

function triggerClick(obj) {
	var evObj = document.createEvent('MouseEvents');
	evObj.initMouseEvent( 'click', true, true, window, 1, 12, 345, 7, 220, false, false, true, false, 0, null );
	obj.dispatchEvent(evObj);
}

function handleDragOver(evt) {
	evt.stopPropagation();
	evt.preventDefault();
	evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}

//modified from http://sweerdenburg.wordpress.com/2011/10/22/converting-a-string-to-xml-in-javascript/
function textToXML(text) {
	try {
		var xml = null;

		var parser = new DOMParser();
		xml = parser.parseFromString( text, "text/xml" );

		var found = xml.getElementsByTagName( "parsererror" );

		if ( !found || !found.length || !found[ 0 ].childNodes.length ) {
		return xml;
		}else{console.log("ParseError"+found.innerHTML);}

		return null;
		
	} catch ( e ) {
		console.log("Error at textToXML 1");
	}
}

function resizeExtGrpListChk(){
	if(document.getElementById('ovl').className == "overlay visible"&&!document.getElementById('grping').hasAttribute("hidden")){
		resizeExtGrpList();
	}
}
function resizeExtGrpList(){
	dialogH = document.getElementById('grping').offsetHeight;
	document.getElementById('sub-extgrp-list').setAttribute("style","height:"+(dialogH-172)+"px");
}