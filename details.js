document.addEventListener('DOMContentLoaded', function () {
	showDetails();
});

function showDetails(){
	chrome.management.getAll(function(extList) {
		var content = "";
		var GRPindex = JSON.parse(localStorage.GRPindex);
		for (var i = 0; i < GRPindex.length; i++){

			var grp = JSON.parse(localStorage["GRP-"+GRPindex[i]]);
			content+="<div class=\"optionGrpTitle\">"+grp.name+"</div>";
			var gItems = grp.items;
			
			for(var w = 0; w < gItems.length; w++){
				var found = false;
				var extInfo;
				for (var j = 0, f = extList.length; j < f; j++) {
					extInfo = extList[j];
					if(gItems[w]==extInfo.id){
						content+="<span class=\"dItems\">- <a href=\""+storeUrl(extInfo.id)+" \" target=\"_blank\">"+extInfo.name+"</a></span>";
						found = true
					}
				}
				if(!found){
					content+="<span class=\"dItems\">- <a class=\"red\" href=\""+storeUrl(gItems[w])+" \" target=\"_blank\">["+chrome.i18n.getMessage("det_notInst")+"]</a></span>";
				}
			}
		}	
		document.getElementById('details').innerHTML += content;
	});
}