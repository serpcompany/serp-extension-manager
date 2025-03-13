document.addEventListener('DOMContentLoaded', function () {
	showDetails();
});

function showDetails(){
	chrome.management.getAll(function(extList) {
		var content = "";
		var GRPindex = [];
		
		// Safely parse GRPindex
		try {
			if (localStorage.GRPindex) {
				GRPindex = JSON.parse(localStorage.GRPindex);
			} else {
				// Initialize if needed
				localStorage.setItem("GRPindex", JSON.stringify([]));
			}
		} catch (e) {
			console.log("Error parsing GRPindex in showDetails: " + e.message);
			// Reset with empty array if corrupted
			localStorage.setItem("GRPindex", JSON.stringify([]));
		}
		
		for (var i = 0; i < GRPindex.length; i++){
			try {
				var grpKey = "GRP-"+GRPindex[i];
				if (!localStorage[grpKey]) {
					continue; // Skip if group data doesn't exist
				}
				
				var grp = JSON.parse(localStorage[grpKey]);
				content+="<div class=\"optionGrpTitle\">"+grp.name+"</div>";
				var gItems = grp.items || [];
				
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
			} catch (e) {
				console.log("Error processing group " + GRPindex[i] + ": " + e.message);
			}
		}	
		document.getElementById('details').innerHTML += content;
	});
}