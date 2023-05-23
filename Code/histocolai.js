var debug = true;
var firstOpen = true;

var dbroot = "php/histocolai_db.php";
var ImageInfo = {};             // regions, and projectID (for the paper.js canvas) for each slices, can be accessed by the slice name. (e.g. ImageInfo[imageOrder[viewer.current_page()]])
                                // regions contain a paper.js path, a unique ID and a name
var imageOrder = [];            // names of slices ordered by their openseadragon page numbers
var currentImage = undefined;   // name of the current image
var prevImage = undefined;      // name of the last image
var region = null;	            // currently selected region (one element of Regions[])
var prevColoredRegion = null;   // previous region in annotation style dialog
var copyRegion;		            // clone of the currently selected region for copy/paste
var handle;			            // currently selected control point or handle (if any)
var selectedTool;	            // currently selected tool
var viewer;			            // open seadragon viewer
var navEnabled = true;          // flag indicating whether the navigator is enabled (if it's not, the annotation tools are)
var magicV = 1000;	            // resolution of the annotation canvas - is changed automatically to reflect the size of the tileSource
var myOrigin = {};	            // Origin identification for DB storage
var	params;			            // /mnt/histocolai/www/ parameters
var	myIP;			            // user's IP
var UndoStack = [];
var RedoStack = [];
var mouseUndo;                  // tentative undo information.
var shortCuts = [];             // List of shortcuts
var newRegionFlag;	            // true when a region is being drawn
var drawingPolygonFlag = false; // true when drawing a polygon
var annotationLoadingFlag;      // true when an annotation is being loaded
var config = {}                 // App configuration object
var isMac = navigator.platform.match(/Mac/i)?true:false;
var isIOS = navigator.platform.match(/(iPhone|iPod|iPad)/i)?true:false;
var changesSaved = true;

var globalLabel = "";
var drawEneb = true;


function newRegion(arg, imageNumber) {
	if( debug ) console.log("> newRegion");
    var reg = {};

	reg.uid = regionUniqueID();
	if( arg.name ) {
		reg.name = arg.name;
	}
    else if(window.location.href.indexOf("vegetation") > -1 || window.location.href.indexOf("TNBC") > -1) {
        reg.name = globalLabel;
    }
    else if(window.location.href.indexOf("crowdsourcing") > -1){
        reg.name = "Tumoral";
    }
	else {		
        reg.name = "Untitled " + reg.uid;
	}
	var color = regionHashColor(reg.name);

	if( arg.path ) {
		reg.path = arg.path;
        reg.path.strokeWidth = arg.path.strokeWidth ? arg.path.strokeWidth : config.defaultStrokeWidth;
        reg.path.strokeColor = arg.path.strokeColor ? arg.path.strokeColor : config.defaultStrokeColor;
		reg.path.strokeScaling = false;
		reg.path.fillColor = arg.path.fillColor ? arg.path.fillColor :'rgba('+color.red+','+color.green+','+color.blue+','+config.defaultFillAlpha+')';
		reg.path.selected = false;
	}

	if( imageNumber === undefined ) {
		imageNumber = currentImage;
	}
	if( imageNumber === currentImage ) {
		// append region tag to regionList
		var el = $(regionTag(reg.name,reg.uid));
		$("#regionList").append(el);

		// handle single click on computers
		el.click(singlePressOnRegion);

		// handle double click on computers
		el.dblclick(doublePressOnRegion);

		// handle single and double tap on touch devices
		/*
		  RT: it seems that a click event is also fired on touch devices,
		  making this one redundant
		*/
		el.on("touchstart",handleRegionTap);
        el.on("pointerdown",handleRegionTap);
        newRegionFlag = false;
	}

    // Select region name in list
    $("#regionList > .region-tag").each(function(i){
        $(this).addClass("deselected");
        $(this).removeClass("selected");
    });

    var tag = $("#regionList > .region-tag#" + reg.uid);
    $(tag).removeClass("deselected");
    $(tag).addClass("selected");

	// push the new region to the Regions array
	ImageInfo[imageNumber]["Regions"].push(reg);
    return reg;
}

function newaddRegion(region, prevRegion){
  if( region.path.selected )
  {
    if( prevRegion && region.path.intersects(prevRegion.path) ) {

     //join two region (object path).
      var newRegion= region.path.unite(prevRegion.path,true);

      if(newRegion.children == null)
      {
        removeRegion(prevRegion);
        region.path.remove();
        region.path = newRegion;

      }
      else
      {
        alert("There is an issue with the regions, please check if the regions are overlapping");
        newRegion.remove();

      }

      region.path.selected = false;
      region.path.fullySelected = false;
      navEnabled = false;
    }
    else
    {
      alert("Please select nearby regions");
    }
    region.path.selected = false;
    region = null;
    backToSelect();
  }
}


function removeRegion(reg, imageNumber) {
	if( debug ) console.log("> removeRegion");

	if( imageNumber === undefined ) {
		imageNumber = currentImage;
	}

	// remove from Regions array
	ImageInfo[imageNumber]["Regions"].splice(ImageInfo[imageNumber]["Regions"].indexOf(reg),1);
	// remove from paths
	reg.path.remove();
	if( imageNumber == currentImage ) {
		// remove from regionList
		var	tag = $("#regionList > .region-tag#" + reg.uid);
		$(tag).remove();
	}
    disableDraw();
}

function selectRegion(reg) {
    if( debug ) console.log("> selectRegion");

    var i;

    // Select path
    for( i = 0; i < ImageInfo[currentImage]["Regions"].length; i++ ) {
        if( ImageInfo[currentImage]["Regions"][i] == reg ) {
            reg.path.selected = true;
            reg.path.fullySelected = true;
            prevColoredRegion = region;
            region = reg;
        } else {
            ImageInfo[currentImage]["Regions"][i].path.selected = false;
            ImageInfo[currentImage]["Regions"][i].path.fullySelected = false;
        }
    }
    paper.view.draw();

    // Select region name in list
    $("#regionList > .region-tag").each(function(i){
        $(this).addClass("deselected");
        $(this).removeClass("selected");
    });

    var tag = $("#regionList > .region-tag#" + reg.uid);
    $(tag).removeClass("deselected");
    $(tag).addClass("selected");

    if(debug) console.log("< selectRegion");

    // update colorPicker
    getAnnotationStyle( reg );
}

function findRegionByUID(uid) {
    if( debug ) console.log("> findRegionByUID");

    var i;
    if( debug > 2 ) console.log( "look for uid: " + uid);
    
    if( debug > 2 ) console.log( "region array lenght: " + ImageInfo[currentImage]["Regions"].length );

    for( i = 0; i < ImageInfo[currentImage]["Regions"].length; i++ ) {

        if( ImageInfo[currentImage]["Regions"][i].uid == uid ) {
            if( debug > 2 ) console.log( "region " + ImageInfo[currentImage]["Regions"][i].uid + ": " );
            if( debug > 2 ) console.log( ImageInfo[currentImage]["Regions"][i] );
            return ImageInfo[currentImage]["Regions"][i];
        }
    }
    return null;
}

function findRegionByName(name) {
    if( debug ) console.log("> findRegionByName");

    var i;
    for( i = 0; i < ImageInfo[currentImage]["Regions"].length; i++ ) {
        if( ImageInfo[currentImage]["Regions"][i].name == name ) {
            return ImageInfo[currentImage]["Regions"][i];
        }
    }
    console.log("Region with name " + name + " not found");
    return null;
}

var counter = 1;
function regionUniqueID() {
    if( debug ) console.log("> regionUniqueID");

    var i;
    var found = false;
    while( found == false ) {
        found = true;
        for( i = 0; i < ImageInfo[currentImage]["Regions"].length; i++ ) {
            if( ImageInfo[currentImage]["Regions"][i].uid == counter ) {
                counter++;
                found = false;
                break;
            }
        }
    }
    return counter;
}

function hash(str) {
    var result = str.split("").reduce(function(a,b) {
        a = ((a<<5)-a) + b.charCodeAt(0);
        return a&a;
    },0);
    return result;
}

function regionHashColor(name) {
    if(debug) console.log("> regionHashColor");

    var color = {};
    var h = hash(name);

    // add some randomness
    h = Math.sin(h++)*10000;
    h = 0xffffff*(h-Math.floor(h));

    return color;
}

function regionTag(name,uid) {
    if( debug ) console.log("> regionTag");

    var str;
    var color = regionHashColor(name);
    if( uid ) {
        var reg = findRegionByUID(uid);
        var mult = 1.0;
        if( reg ) {
            mult = 255;
            color = reg.path.fillColor;
        }
        else {
            color = regionHashColor(name);
        }
        str = [ "<div class='region-tag' id='" + uid + "' style='padding:2px'>",
                "<img class='eye' title='Region visible' id='eye_" + uid + "' src='img/eyeOpened.svg' />",
                "<div class='region-color'",
                "style='background-color:rgba(",
                parseInt(color.red*mult),",",parseInt(color.green*mult),",",parseInt(color.blue*mult),",0.67",
                ")'></div>",
                "<span class='region-name'>" + name + "</span>",
                "</div>",
                ].join(" ");
    }
    else {
        color = regionHashColor(name);
        str = [ "<div class='region-tag' style='padding:2px'>",
                "<div class='region-color'",
                "style='background-color:rgba(",
                color.red,",",color.green,",",color.blue,",0.67",
                ")'></div>",
                "<span class='region-name'>" + name + "</span>",
                "</div>",
                ].join(" ");
    }
    return str;
}

function appendRegionTagsFromOntology(o) {
    if( debug ) console.log("> appendRegionTagsFromOntology");

    for( var i = 0; i < o.length; i++ ) {
        if( o[i].parts ) {
            $("#regionPicker").append("<div>"+o[i].name+"</div>");
            appendRegionTagsFromOntology(o[i].parts);
        }
        else {
            var tag = regionTag(o[i].name);
            var el = $(tag).addClass("ontology");
            $("#regionPicker").append(el);

            // handle single click on computers
            el.click(singlePressOnRegion);

            // handle double click on computers
            el.dblclick(doublePressOnRegion);

            el.on("touchstart",handleRegionTap);
            el.on("pointerdown",handleRegionTap);
        }
    }
}

function regionPicker(parent) {
    if( debug ) console.log("> regionPicker");

    $("div#regionPicker").appendTo("body");
    $("div#regionPicker").show();
}

function changeRegionName(reg,name) {
    if( debug ) console.log("> changeRegionName");

    var i;
    var color = regionHashColor(name);

    // Update path
    reg.name = name;
    reg.path.fillColor = 'rgba('+color.red+','+color.green+','+color.blue+',0.5)';
    paper.view.draw();

    // Update region tag
    $(".region-tag#" + reg.uid + ">.region-name").text(name);
    $(".region-tag#" + reg.uid + ">.region-color").css('background-color','rgba('+color.red+','+color.green+','+color.blue+',0.67)');
    
    disableDraw();

}

/*** toggle visibility of region
***/
function toggleRegion(reg) {
    if( region !== null ) {
        if( debug ) console.log("> toggle region");

        var color = regionHashColor(reg.name);
        if( reg.path.fillColor !== null ) {
            reg.path.storeColor = reg.path.fillColor;
            reg.path.fillColor = null;

            reg.path.strokeWidth = 0;
            reg.path.fullySelected = false;
            reg.storeName = reg.name;
            $('#eye_' + reg.uid).attr('src','img/eyeClosed.svg');
        }
        else {
            reg.path.fillColor = reg.path.storeColor;
            reg.path.strokeWidth = 1;
            reg.name = reg.storeName;
            $('#eye_' + reg.uid).attr('src','img/eyeOpened.svg');
        }
        paper.view.draw();
        $(".region-tag#" + reg.uid + ">.region-name").text(reg.name);
    }
}

function updateRegionList() {
    if( debug ) console.log("> updateRegionList");

    // remove all entries in the regionList
    $("#regionList > .region-tag").each(function() {
        $(this).remove();
    });

    // adding entries corresponding to the currentImage
    for( var i = 0; i < ImageInfo[currentImage]["Regions"].length; i++ ) {
        var reg = ImageInfo[currentImage]["Regions"][i];
        // append region tag to regionList
        var el = $(regionTag(reg.name,reg.uid));
        $("#regionList").append(el);

        // handle single click on computers
        el.click(singlePressOnRegion);
        // handle double click on computers
        el.dblclick(doublePressOnRegion);
        // handle single and double tap on touch devices
        el.on("touchstart",handleRegionTap);
        el.on("pointerdown",handleRegionTap);
    }
    disableDraw();
}

function checkRegionSize(reg) {
    if( reg.path.length > 0 ) {
        return;
    }
    else {
        removeRegion(region, currentImage);
    }
}


/***2
    Interaction: mouse and tap
*/
function clickHandler(event){
    if( debug ) console.log("> clickHandler");

    event.stopHandlers = !navEnabled;
    if( selectedTool == "draw" ) {
        checkRegionSize(region);
    }
    newRegionFlag=false;

}

function pressHandler(event){
    if( debug ) console.log("> pressHandler");

    if( !navEnabled ) {
        event.stopHandlers = true;
        mouseDown(event.originalEvent.layerX,event.originalEvent.layerY);
    }
}

function dragHandler(event){
    if( debug > 1 )
        console.log("> dragHandler");


    if( !navEnabled ) {
        event.stopHandlers = true;
        mouseDrag(event.originalEvent.layerX,event.originalEvent.layerY,event.delta.x,event.delta.y);
    }
}

function dragEndHandler(event){
    if( debug ) console.log("> dragEndHandler");

    if( !navEnabled ) {
        event.stopHandlers = true;
        mouseUp();
    }
}

function singlePressOnRegion(event) {
    if( debug ) console.log("> singlePressOnRegion");

    event.stopPropagation();
    event.preventDefault();

    var el = $(this);
    var uid;
    var reg;

    if( debug ) console.log(event);
    if( event.clientX > 20 ) {
        if( event.clientX > 50 ) {

            if( el.hasClass("ontology") ) {
                var newName = el.find(".region-name").text();
                globalLabel = newName
                uid = $(".region-tag.selected").attr('id');
                reg = findRegionByUID(uid);
                changeRegionName(reg,newName);
                $("div#regionPicker").appendTo($("body")).hide();
            }
            else {
                uid = $(this).attr('id');
                reg = findRegionByUID(uid);
                if( reg ) {
                    selectRegion(reg);
                }
                else
                    console.log("region undefined");
            }
        }
        else {
            var reg = findRegionByUID(this.id);
            if( reg.path.fillColor != null ) {
                if( reg ) {
                selectRegion(reg);
                }
                annotationStyle(reg);
            }
        }
    }
    else {
        var reg = findRegionByUID(this.id);
        toggleRegion(reg);
    }
}

function doublePressOnRegion(event) {
    if( debug ) console.log("> doublePressOnRegion");

    event.stopPropagation();
    event.preventDefault();

    if( event.clientX > 20 ) {
        if( event.clientX > 50 ) {
            if( config.drawingEnabled ) {
                if( config.regionOntology == true ) {
                regionPicker(this);
                }
                else {
                    var name = prompt("Region name", findRegionByUID(this.id).name);
                    if( name != null ) {
                        changeRegionName(findRegionByUID(this.id), name);
                    }
                }
            }
        }
        else {
            var reg = findRegionByUID(this.id);
            if( reg.path.fillColor != null ) {
                if( reg ) {
                selectRegion(reg);
                }
                annotationStyle(reg);
            }
        }
    }
    else {
        var reg = findRegionByUID(this.id);
        toggleRegion(reg);
    }
}

var tap = false
function handleRegionTap(event) {
/*
    Handles single and double tap in touch devices
*/
    if( debug ) console.log("> handleRegionTap");

    var caller = this;

    if(event.clientX == undefined) {
        if(event.originalEvent.touches == undefined) {
            event.clientX = event.originalEvent.clientX;
        }else{
            event.clientX = event.originalEvent.touches["0"].clientX;
        }
    }
    if(event.clientY == undefined) {
        if(event.originalEvent.touches == undefined) {
            event.clientY = event.originalEvent.clientY;
        }else{
            event.clientY = event.originalEvent.touches["0"].clientY;
        }
    }

    if( !tap ){ //if tap is not set, set up single tap
        tap = setTimeout(function() {
            tap = null
        },600);

        // call singlePressOnRegion(event) using 'this' as context
        singlePressOnRegion.call(this,event);
    } else {
        clearTimeout(tap);
        tap = null;

        // call doublePressOnRegion(event) using 'this' as context
        doublePressOnRegion.call(this,event);
    }

    if( debug ) console.log("< handleRegionTap");
}

function mouseDown(x,y) {
    if( debug > 1 ) console.log("> mouseDown");

    mouseUndo = getUndo();
    var prevRegion = null;
    var point = paper.view.viewToProject(new paper.Point(x,y));

    handle = null;

    switch( selectedTool ) {
        case "select":
        case "addpoint":
        case "delpoint":
        case "addregion":
        case "delregion":
        case "splitregion": {
            var hitResult = paper.project.hitTest(point, {
                    tolerance: 10,
                    stroke: true,
                    segments: true,
                    fill: true,
                    handles: true
                });

            newRegionFlag = false;
            if( hitResult ) {
                var i;
                for( i = 0; i < ImageInfo[currentImage]["Regions"].length; i++ ) {
                    if( ImageInfo[currentImage]["Regions"][i].path == hitResult.item ) {
                        re = ImageInfo[currentImage]["Regions"][i];
                        break;
                    }
                }

                // select path
                if( region && region != re ) {
                    region.path.selected = false;
                    prevRegion = region;
                }
                selectRegion(re);

                if( hitResult.type == 'handle-in' ) {
                    handle = hitResult.segment.handleIn;
                    handle.point = point;
                }
                else if( hitResult.type == 'handle-out' ) {
                    handle = hitResult.segment.handleOut;
                    handle.point = point;
                }
                else if( hitResult.type == 'segment' ) {
                    if( selectedTool == "select" ) {
                        handle = hitResult.segment.point;
                        handle.point = point;
                    }
                    if( selectedTool == "delpoint" ) {
                        hitResult.segment.remove();
                        commitMouseUndo();
                    }
                }
                else if( hitResult.type == 'stroke' && selectedTool == "addpoint" ) {
                    region.path
                    .curves[hitResult.location.index]
                    .divide(hitResult.location);
                    region.path.fullySelected = true;
                    commitMouseUndo();
                    paper.view.draw();
                }
                else if( selectedTool == "addregion" ) {
                  alert("Sorry, the button it is not able at the moment");
                  newaddRegion(region,prevRegion);
                }
                else if( selectedTool == "delregion" ) {
                    if( prevRegion ) {
                        var newPath = prevRegion.path.subtract(region.path);
                        removeRegion(prevRegion);
                        prevRegion.path.remove();
                        newRegion({path:newPath});
                        updateRegionList();
                        selectRegion(region);
                        paper.view.draw();
                        backToSelect();
                    }
                }
                else if( selectedTool == "splitregion" ) {
                    /*selected region is prevRegion!
                    region is the region that should be split based on prevRegion
                    newRegionPath is outlining that part of region which has not been overlaid by prevRegion
                    i.e. newRegion is what was region
                    and prevRegion color should go to the other part*/
                    if( prevRegion ) {
                        var prevColor = prevRegion.path.fillColor;
                        var color = region.path.fillColor;
                        var newPath = region.path.divide(prevRegion.path);

                        removeRegion(prevRegion);
                        region.path.remove();

                        region.path = newPath;
                        var newReg;
                        for( i = 0; i < newPath._children.length; i++ )
                        {
                            if( i == 0 ) {
                                region.path = newPath._children[i];
                            }
                            else {
                                newReg = newRegion({path:newPath._children[i]});
                            }
                        }
                        region.path.fillColor = color;
                        if( newReg ) {
                            newReg.path.fillColor = prevColor;
                        }

                        updateRegionList();
                        selectRegion(newReg);
                        paper.view.draw();
                        commitMouseUndo();
                        cmdDeleteSelected();
                        backToSelect();
                    }
                }

                break;
            }
            if( hitResult == null && region ) {
                region.path.selected = false;
                region = null;
            }
            break;
        }
        case "draw": {
            // Start a new region
            // if there was an older region selected, unselect it
            if( region ) {
                region.path.selected = false;
            }
            // start a new region
            var path = new paper.Path({segments:[point]})
            path.strokeWidth = config.defaultStrokeWidth;
            region = newRegion({path:path});
            
            // F180118: added transparency when drawing the polygon
            region.path.fillColor.alpha = 0.2;
            // signal that a new region has been created for drawing
            newRegionFlag = true;

            // F161121: to ask for confirmation when closing only if changes have been made
            changesSaved = true;

            commitMouseUndo();
            break;
        }
        case "draw-polygon": {
            if( drawingPolygonFlag == false ) {
                if( region )
                    region.path.selected = false;
                var path = new paper.Path({segments:[point]})
                path.strokeWidth = config.defaultStrokeWidth;
                region = newRegion({path:path});
                region.path.fillColor.alpha = 0;
                region.path.selected = true;
                drawingPolygonFlag = true;
                commitMouseUndo();
            } else {
                var hitResult = paper.project.hitTest(point, {tolerance:10, segments:true});
                if( hitResult && hitResult.item == region.path && hitResult.segment.point == region.path.segments[0].point ) {
                    // clicked on first point of current path
                    // --> close path and remove drawing flag
                    finishDrawingPolygon(true);

                    // F161121: to ask for confirmation when closing only if changes have been made
                    changesSaved = false;

                } else {
                    // add point to region
                    region.path.add(point);
                    commitMouseUndo();
                }
            }
            break;
        }
        case "rotate":
            region.origin = point;
            break;
    }
    paper.view.draw();
}

function mouseDrag(x,y,dx,dy) {
    if( debug ) console.log("> mouseDrag");

    var point = paper.view.viewToProject(new paper.Point(x,y));

    var orig = paper.view.viewToProject(new paper.Point(0,0));
    var dpoint = paper.view.viewToProject(new paper.Point(dx,dy));
    dpoint.x -= orig.x;
    dpoint.y -= orig.y;

    if( handle ) {
        handle.x += point.x-handle.point.x;
        handle.y += point.y-handle.point.y;
        handle.point = point;
        commitMouseUndo();
    } else
    if( selectedTool == "draw" ) {
        region.path.add(point);
    } else
    if( selectedTool == "select" ) {
        for( i in ImageInfo[currentImage]["Regions"] ) {
            var reg = ImageInfo[currentImage]["Regions"][i];
            if( reg.path.selected ) {
                reg.path.position.x += dpoint.x;
                reg.path.position.y += dpoint.y;
                commitMouseUndo();
            }
        }
    }
    if( selectedTool == "rotate" ) {
        event.stopHandlers = true;
        var degree = parseInt(dpoint.x);
        var i;
        for( i in ImageInfo[currentImage]["Regions"] ) {
            if( ImageInfo[currentImage]["Regions"][i].path.selected ) {
                ImageInfo[currentImage]["Regions"][i].path.rotate(degree, region.origin);
                commitMouseUndo();
            }
        }
    }
    if( selectedTool == "addregion" ) {
          event.stopHandlers = true;
          commitMouseUndo();
    }
    // F161121: to ask for confirmation when closing only if changes have been made
    changesSaved = false;
    paper.view.draw();
}

function mouseUp() {
    if( debug ) console.log("> mouseUp");

    if( newRegionFlag == true ) {
        region.path.closed = true;
        region.path.fullySelected = true;
        var orig_segments = region.path.segments.length;
        var final_segments = region.path.segments.length;
        if( debug > 2 ) console.log( parseInt(final_segments/orig_segments*100) + "% segments conserved" );

        newRegionFlag = false;
        }
    
    paper.view.draw();
}

/*** simplify the region path
***/
function simplify() {
    if( region !== null ) {
        if( debug ) console.log("> simplifying region path");

        var orig_segments = region.path.segments.length;
        region.path.simplify(0);
        var final_segments = region.path.segments.length;
        console.log( parseInt(final_segments/orig_segments*100) + "% segments conserved" );
        paper.view.draw();

    }
}

/*** flip region along y-axis around its center point
***/
function flipRegion(reg) {
    if( region !== null ) {
        if( debug ) console.log("> flipping region");

        var i;
        for( i in ImageInfo[currentImage]["Regions"] ) {
            if( ImageInfo[currentImage]["Regions"][i].path.selected ) {
                ImageInfo[currentImage]["Regions"][i].path.scale(-1, 1);
            }
        }
    paper.view.draw();
    }
}

function toggleHandles() {
    console.log("> toggleHandles");
    if (region != null) {
        if (region.path.hasHandles()) {
            if (confirm('Do you really want to remove the handles?')) {
                var undoInfo = getUndo();
                region.path.clearHandles();
                saveUndo(undoInfo);
            }
        }
        else {
            var undoInfo = getUndo();
            region.path.smooth();
            saveUndo(undoInfo);
        }
        paper.view.draw();
    }

}

var currentColorRegion;
// add leading zeros
function pad(number, length) {
    var str = '' + number;
    while( str.length < length )
        str = '0' + str;
    return str;
}

function getAnnotationStyle( reg ) {
    if( debug ) console.log( reg.path.fillColor );

    if( region !== null ) {
        if( debug ) console.log( "> changing annotation style" );

        currentColorRegion = reg;
        var alpha = reg.path.fillColor.alpha;
        $('#alphaSlider').val(alpha*100);
        $('#alphaFill').val(parseInt(alpha*100));

        var hexColor = '#' + pad(( parseInt(reg.path.fillColor.red * 255) ).toString(16),2) + pad(( parseInt(reg.path.fillColor.green * 255) ).toString(16),2) + pad(( parseInt(reg.path.fillColor.blue * 255) ).toString(16),2);
        if( debug ) console.log(hexColor);

        $('#fillColorPicker').val( hexColor );


        var stroke = reg.path.strokeColor;
        if( debug ) {
            console.log( stroke.red + " " + stroke.green + " " + stroke.blue );
        }
        if ( stroke.red == 0 && stroke.green == 0 && stroke.blue == 0 ) $('#selectStrokeColor').val( '0' );
        else if ( stroke.red == 1 && stroke.green == 1 && stroke.blue == 1 ) $('#selectStrokeColor').val( '1' );
        else if ( stroke.red == 1 && stroke.green == 0 && stroke.blue == 0 ) $('#selectStrokeColor').val( '2' );
        else if ( stroke.red == 0 && stroke.green == 0 && stroke.blue == 1 ) $('#selectStrokeColor').val( '4' );
        else if ( stroke.red == 1 && stroke.green == 1 && stroke.blue == 0 ) $('#selectStrokeColor').val( '5' );
        else $('#selectStrokeColor').val( '3' );
    }
}

function annotationStyle( reg ) {
    getAnnotationStyle( reg );

    if( $('#colorSelector').css('display') == 'none' ) {
        $('#colorSelector').css('display', 'block');
    }
    else if( prevColoredRegion !== reg ) {
        $('#colorSelector').css('display', 'block');
    }
    else {
        $('#colorSelector').css('display', 'none');
    }
}

function setRegionColor() {
    var reg = currentColorRegion;
    var hexColor = $('#fillColorPicker').val();
    var red = parseInt( hexColor.substring(1,3), 16 );
    var green = parseInt( hexColor.substring(3,5), 16 );
    var blue = parseInt( hexColor.substring(5,7), 16 );

    reg.path.fillColor.red = red / 255;
    reg.path.fillColor.green = green / 255;
    reg.path.fillColor.blue = blue / 255;
    reg.path.fillColor.alpha = $('#alphaSlider').val() / 100;

    // update region tag
    $(".region-tag#" + reg.uid + ">.region-color").css('background-color','rgba('+red+','+green+','+blue+',0.67)');

    // update stroke color
    switch( $('#selectStrokeColor')[0].selectedIndex ) {
        case 0:
            reg.path.strokeColor = "black";
            break;
        case 1:
            reg.path.strokeColor = "white";
            break;
        case 2:
            reg.path.strokeColor = "red";
            break;
        case 3:
            reg.path.strokeColor = "green";
            break;
        case 4:
            reg.path.strokeColor = "blue";
            break;
        case 5:
            reg.path.strokeColor = "yellow";
            break;
    }
    $('#colorSelector').css('display', 'none');
}
/*** update all values on the fly
***/
function onFillColorPicker(value) {
    $('#fillColorPicker').val(value);
    var reg = currentColorRegion;
    var hexColor = $('#fillColorPicker').val();
    var red = parseInt( hexColor.substring(1,3), 16 );
    var green = parseInt( hexColor.substring(3,5), 16);
    var blue = parseInt( hexColor.substring(5,7), 16);
    reg.path.fillColor.red = red / 255;
    reg.path.fillColor.green = green / 255;
    reg.path.fillColor.blue = blue / 255;
    reg.path.fillColor.alpha = $('#alphaSlider').val() / 100;
    paper.view.draw();
}

function onSelectStrokeColor() {
    var reg = currentColorRegion;
    switch( $('#selectStrokeColor')[0].selectedIndex ) {
        case 0:
            reg.path.strokeColor = "black";
            break;
        case 1:
            reg.path.strokeColor = "white";
            break;
        case 2:
            reg.path.strokeColor = "red";
            break;
        case 3:
            reg.path.strokeColor = "green";
            break;
        case 4:
            reg.path.strokeColor = "blue";
            break;
        case 5:
            reg.path.strokeColor = "yellow";
            break;
    }
    paper.view.draw();
}

function onAlphaSlider(value) {
    $('#alphaFill').val(value);
    var reg = currentColorRegion;
    reg.path.fillColor.alpha = $('#alphaSlider').val() / 100;
    paper.view.draw();
}

function onAlphaInput(value) {
    $('#alphaSlider').val(value);
    var reg = currentColorRegion;
    reg.path.fillColor.alpha = $('#alphaSlider').val() / 100;
    paper.view.draw();
}

function onStrokeWidthDec() {
    var reg = currentColorRegion;
    reg.path.strokeWidth = Math.max(region.path.strokeWidth - 1, 1);
    paper.view.draw();
}

function onStrokeWidthInc() {
    var reg = currentColorRegion;
    reg.path.strokeWidth = Math.min(region.path.strokeWidth + 1, 10);
    paper.view.draw();
}

/*** UNDO ***/

/**
 * Command to actually perform an undo.
 */
function cmdUndo() {
    if( UndoStack.length > 0 ) {
        var redoInfo = getUndo();
        var undoInfo = UndoStack.pop();
        applyUndo(undoInfo);
        RedoStack.push(redoInfo);
        paper.view.draw();
    }

}
/**
 * Command to actually perform a redo.
 */
function cmdRedo() {
    if( RedoStack.length > 0 ) {
        var undoInfo = getUndo();
        var redoInfo = RedoStack.pop();
        applyUndo(redoInfo);
        UndoStack.push(undoInfo);
        paper.view.draw();
    }
}
/**
 * Return a complete copy of the current state as an undo object.
 */
function getUndo() {
    var undo = { imageNumber: currentImage, regions: [], drawingPolygonFlag: drawingPolygonFlag };
    var info = ImageInfo[currentImage]["Regions"];

    for( var i = 0; i < info.length; i++ ) {
        var el = {
            json: JSON.parse(info[i].path.exportJSON()),
            name: info[i].name,
            selected: info[i].path.selected,
            fullySelected: info[i].path.fullySelected
        }
        undo.regions.push(el);
    }
    return undo;
}
/**
 * Save an undo object. This has the side-effect of initializing the
 * redo stack.
 */
function saveUndo(undoInfo) {
	UndoStack.push(undoInfo);
	RedoStack = [];
}

function setImage(imageNumber) {
    if( debug ) console.log("> setImage");
    var index = imageOrder.indexOf(imageNumber);

    // update image slider
    update_slider_value(index);

    loadImage(imageOrder[index]);
}
/**
 * Restore the current state from an undo object.
 */
function applyUndo(undo) {
    if( undo.imageNumber !== currentImage )
        setImage(undo.imageNumber);
    var info = ImageInfo[undo.imageNumber]["Regions"];
    while( info.length > 0 )
        removeRegion(info[0], undo.imageNumber);
    region = null;
    for( var i = 0; i < undo.regions.length; i++ ) {
        var el = undo.regions[i];
		var project = paper.projects[ImageInfo[undo.imageNumber]["projectID"]];
		/* Create the path and add it to a specific project.
		 */
		var path = new paper.Path();
		project.addChild(path);
		path.importJSON(el.json);
		reg = newRegion({name:el.name, path:path}, undo.imageNumber);
        // here order matters. if fully selected is set after selected, partially selected paths will be incorrect
  		reg.path.fullySelected = el.fullySelected;
 		reg.path.selected = el.selected;
		if( el.selected ) {
			if( region === null )
				region = reg;
			else
				console.log("Should not happen: two regions selected?");
		}
    }
    drawingPolygonFlag = undo.drawingPolygonFlag;
}
/**
 * If we have actually made a change with a mouse operation, commit
 * the undo information.
 */
function commitMouseUndo() {

    if( mouseUndo !== undefined ) {
        saveUndo(mouseUndo);
        mouseUndo = undefined;
    }

}
/***3
    Tool selection
*/

function finishDrawingPolygon(closed){
        // finished the drawing of the polygon
        if( closed == true ) {
            region.path.closed = true;
            region.path.fillColor.alpha = config.defaultFillAlpha;
        } else {
            region.path.fillColor.alpha = 0;
        }
        region.path.fullySelected = true;
        //region.path.smooth();
        drawingPolygonFlag = false;
        commitMouseUndo();
}

function backToPreviousTool(prevTool) {
    setTimeout(function() {
        selectedTool = prevTool;
        selectTool()
    },500);
}

function backToSelect() {

    setTimeout(function() {
        selectedTool = "select";
        selectTool()
    },500);
}

/**
 * This function deletes the currently selected object.
 */
function cmdDeleteSelected() {
    var undoInfo = getUndo();
    var i;
    for( i in ImageInfo[currentImage]["Regions"] ) {
        if( ImageInfo[currentImage]["Regions"][i].path.selected ) {
            removeRegion(ImageInfo[currentImage]["Regions"][i]);
            saveUndo(undoInfo);
            paper.view.draw();
            break;
        }
    }

}

function cmdPaste() {
    if( copyRegion !== null ) {
        var undoInfo = getUndo();
        saveUndo(undoInfo);
        console.log( "paste " + copyRegion.name );
        if( findRegionByName(copyRegion.name) ) {
            copyRegion.name += " Copy";
        }
        var reg = JSON.parse(JSON.stringify(copyRegion));
        reg.path = new paper.Path();
        reg.path.importJSON(copyRegion.path);
        reg.path.fullySelected = true;
        var color = regionHashColor(reg.name);
        reg.path.fillColor = 'rgba(' + color.red + ',' + color.green + ',' + color.blue + ',0.5)';
        newRegion({name:copyRegion.name,path:reg.path});
    }
    paper.view.draw();
}

function cmdCopy() {
    if( region !== null ) {
    var json = region.path.exportJSON();
    copyRegion = JSON.parse(JSON.stringify(region));
    copyRegion.path = json;
    console.log( "< copy " + copyRegion.name );
    }
}

function toolSelection(event) {
    if( debug ) console.log("> toolSelection");

    if( drawingPolygonFlag == true )
        finishDrawingPolygon(true);

    var prevTool = selectedTool;
    selectedTool = $(this).attr("id");
    selectTool();

    switch(selectedTool) {
        case "select":
        case "addpoint":
        case "delpoint":
        case "addregion":
        case "delregion":
        case "draw":
            if( debug ) console.log("> toolSelection: draw");
        case "rotate":
        case "draw-polygon":
            navEnabled = false;
            break;
        case "Zoom":
            if( debug ) console.log("> toolSelection: home");
            navEnabled = true;
            handle = null;
            break;
        case "delete":
            cmdDeleteSelected();
            backToPreviousTool(prevTool);
            break;
        case "save":
            histocolaiDBSave();
            backToPreviousTool(prevTool);
            break;
        case "Zoomin":
            if( debug ) console.log("> toolSelection: zoom-in");
            break;
        case "Zoomout":
            if( debug ) console.log("> toolSelection: zoom-out");
            break;
        case "Home":
            if( debug ) console.log("> toolSelection: Home");
            backToPreviousTool(prevTool);
            handle = null;
            break;
        case "prev":
            loadPreviousImage();
            backToPreviousTool(prevTool);
            break;
        case "next":
            loadNextImage();
            backToPreviousTool(prevTool);
            break;
        case "copy":
            cmdCopy();
            backToSelect();
            break;
        case "paste":
            cmdPaste();
            backToSelect();
            break;
        case "simplify":
            simplify(region);
            backToSelect();
            break;
        case "flip":
            flipRegion(region);
            backToSelect();
            break;
        case "closeMenu":
            toggleMenu();
            backToPreviousTool(prevTool);
            break;
        case "openMenu":
            toggleMenu();
            backToPreviousTool(prevTool);
            break;
        case "handle":
            toggleHandles();
            backToPreviousTool(prevTool);
            break;
    }
}

function selectTool() {
    if( debug ) console.log("> selectTool");

    $("img.button").removeClass("selected");
    $("img.button#" + selectedTool).addClass("selected");
}


/***4
    Annotation storage
*/

/* histocolaiDB push/pull */
function histocolaiDBSave() {
/*
    Save SVG overlay to histocolaiDB
*/
    
    if( debug ) console.log("> save promise");

    // F: deselect paths
    if(region && region.path.selected == true )
        region.path.selected = false;
    // key
    var key = "regionPaths";
    var savedSlices = "Saving slices: ";

    for( var sl in ImageInfo ) {
        if ((config.multiImageSave == false) && (sl != currentImage)){
            continue;
        }
        // configure value to be saved
        var slice = ImageInfo[sl];
        var value = {};
        value.Regions = [];
				for( var i = 0; i < slice.Regions.length; i++ )
        {
            var el = {};
            el.path = JSON.parse(slice.Regions[i].path.exportJSON());
            el.name = slice.Regions[i].name;
            el.filename = slice.source;
            value.Regions.push(el);
        }

        // check if the slice annotations have changed since loaded by computing a hash
        var h = hash(JSON.stringify(value.Regions)).toString(16);
        if( debug > 1 )
            console.log("hash:",h,"original hash:",slice.Hash);

        // if the slice hash is undefined, this slice has not yet been loaded. do not save anything for this slice
        if( slice.Hash == undefined || h==slice.Hash && slice.needToSave == false ) {
            if( debug > 1 )
                console.log("No change, no save");
            value.Hash = h;
            continue;
        }
        value.Hash = h;
        savedSlices += sl.toString() + " ";
        // F161122: avoid bug when there are no annotations in slice
        value.filename = ImageInfo[sl]["source"];

        // check if the annotation is correct for save it
        let annot = Object.getOwnPropertyNames(value);
        if(annot[2] === 'filename')
        {
            (function(sl, h) {
                console.log('saving slice ', sl);
                $.ajax({
                    url:dbroot,
                    type:"POST",
                    data:{
                        "action":"save",
                        "origin":JSON.stringify({
                            appName:	myOrigin.appName,
                            slice:  	sl,
                            source:	 	myOrigin.source,
                            user:   	myOrigin.user
                        }),
                        "key":key,
                        "value":JSON.stringify(value),
                        "finished":slice.finished
                    },
                    success: function(data) {
                        console.log("< histocolaiDBSave resolve: Successfully saved regions:",ImageInfo[sl].Regions.length,"slice: " + sl.toString(),"response:",data);
                        //update hash
                        ImageInfo[sl].Hash = h;
                        // F161121: to ask for confirmation when closing only if changes have been made
                        changesSaved = true;
                        ImageInfo[sl]["needToSave"] = false;
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        console.log("< histocolaiDBSave resolve: ERROR: " + textStatus + " " + errorThrown,"slice: "+sl.toString());
                    }
                });
                //show dialog box with timeout
                $('#saveDialog').html(savedSlices).fadeIn();
                setTimeout(function() { $("#saveDialog").fadeOut(0);},1000);
                
            })(sl, h);   
        }else{alert("There was an issue saving the annotation, please wait 30 seconds and try to save again");}

        // post data to database
    }
}


// F 180525: function to copy annotations from user "auto" to user selected in listbox
/* histocolaiDB push/pull */
function copyAnnotationFromAutoTo(user_to_copy_to) {
    /*
        Save SVG overlay to histocolaiDB
    */
        if( debug ) console.log("> save promise");

        // F: deselect paths
        if(region && region.path.selected == true )
            region.path.selected = false;

        // key
        var key = "regionPaths";
        var savedSlices = "Saving slices: ";


        // configure value to be saved -> SAVE ONLY THE CURRENT SLICE
        // save only if needToSave == False
        sl = currentImage;
        if (ImageInfo[sl]["needToSave"] == false) {

            var slice = ImageInfo[sl];
            var value = {};
            value.Regions = [];
            for( var i = 0; i < slice.Regions.length; i++ )
            {
                var el = {};
                el.path = JSON.parse(slice.Regions[i].path.exportJSON());
                el.name = slice.Regions[i].name;
                el.filename = slice.source;
                value.Regions.push(el);
            }

            // check if the slice annotations have changed since loaded by computing a hash
            var h = hash(JSON.stringify(value.Regions)).toString(16);
            if( debug > 1 )
                console.log("hash:",h,"original hash:",slice.Hash);

            // if the slice hash is undefined, this slice has not yet been loaded. do not save anything for this slice
            if( slice.Hash == undefined) {// || h==slice.Hash && slice.needToSave == false ) {
                if( debug > 1 )
                    console.log("No change, no save");
                value.Hash = h;
                return;
            }
            value.Hash = h;
            savedSlices += sl.toString() + " ";
            // F161122: avoid bug when there are no annotations in slice
            value.filename = ImageInfo[sl]["source"];

            // post data to database
            (function(sl, h) {
            console.log('saving slice ', sl);
            $.ajax({
                url:dbroot,
                type:"POST",
                data:{
                    "action":"save",
                    "origin":JSON.stringify({
                        appName:	myOrigin.appName,
                        slice:  	sl,
                        source:	 	myOrigin.source,
                        user:   	user_to_copy_to //myOrigin.user
                    }),
                    "key":key,
                    "value":JSON.stringify(value),
                    "finished":slice.finished
                },
                success: function(data) {
                    console.log("< histocolaiDBSave resolve: Successfully copied regions: ",ImageInfo[sl].Regions.length," slice: " + sl.toString(), " to user: " +  user_to_copy_to, " response:",data);

                    $('#saveDialog').html('Slice ' + savedSlices + ' copied to ' + user_to_copy_to).fadeIn();
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    console.log("< histocolaiDBSave resolve: ERROR: " + textStatus + " " + errorThrown,"slice: "+sl.toString());
                }
            });
            })(sl, h);

            //show dialog box with timeout
            $('#saveDialog').html(' - <br><br><b>Slice ' + savedSlices + ' coppied to ' + user_to_copy_to + '</b>').fadeIn();
            setTimeout(function() { $("#saveDialog").fadeOut(2000);},2000);
        }else{
            $('#saveDialog').html('You need to save the slice before copying it!').fadeIn();
        }
}

function histocolaiDBLoad() {
/*
    Load SVG overlay from histocolaiDB
*/    
    disableDraw();
	if( debug ) console.log("> histocolaiDBLoad promise");

    // F170710: to remove drawing tools in case of guest user or add them otherwise
     checkGuestUser(); // better done in loadImage(), executes before

    // F180522: to remove "copy to" functionality if not "auto" user
    // checkAutoUser(); // already done in loadImage()

	var	def = $.Deferred();
	var	key = "regionPaths";
	var slice = myOrigin.slice;
    $.get(dbroot,{
		"action":"load_last",
		"origin":JSON.stringify(myOrigin),
		"key":key
	}).success(function(data) {
		var	i,obj,reg;
		annotationLoadingFlag = false;

		// if the slice that was just loaded does not correspond to the current slice,
		// do not display this one and load the current slice.
		if( slice != currentImage ) {
            histocolaiDBLoad()
            .then(function() {
                $("#regionList").height($(window).height()-$("#regionList").offset().top);
                updateRegionList();
                paper.view.draw();
            });
            def.fail();
		    return;
		}

    // if there is no data on the current slice
    // save hash for the image none the less
    if( data.length == 0 ) {
        ImageInfo[currentImage]["Hash"] = hash(JSON.stringify(ImageInfo[currentImage]["Regions"])).toString(16);
        return;
    }

		// parse the data and add to the current canvas
		if( debug ) console.log("[",data,"]");

		obj = JSON.parse(data);
		if( obj ) {

			// F161121: added checkbox to say if annotation is finished
			ImageInfo[currentImage]["finished"] = (obj.finished == 1) ? true : false;
			$("#annotation-ended")[0]['checked'] = ImageInfo[currentImage]["finished"];

			obj = JSON.parse(obj.myValue);
			for( i = 0; i < obj.Regions.length; i++ ) {
				var reg = {};
				var	json;
				reg.name = obj.Regions[i].name;
				reg.page = obj.Regions[i].page;
				json = obj.Regions[i].path;
				reg.path = new paper.Path();
				reg.path.importJSON(json);
				newRegion({name:reg.name,path:reg.path});
			}

			paper.view.draw();
			ImageInfo[currentImage]["Hash"] = (obj.Hash ? obj.Hash : hash(JSON.stringify(ImageInfo[currentImage]["Regions"])).toString(16));

		}
		if( debug ) console.log("< histocolaiDBLoad resolve success. Number of regions:", ImageInfo[currentImage]['Regions'].length);
		def.resolve();
	}).error(function(jqXHR, textStatus, errorThrown) {
        console.log("< histocolaiDBLoad resolve ERROR: " + textStatus + " " + errorThrown);
		annotationLoadingFlag = false;
    });

    return def.promise();
}

function histocolaiDBIP() {
/*
    Get my IP
*/
    if( debug ) console.log("> histocolaiDBIP promise");

    $("#regionList").html("<br />Connecting to database...");
    return $.get(dbroot,{
        "action":"remote_address"
    }).success(function(data) {
        if( debug ) console.log("< histocolaiDBIP resolve: success");
        $("#regionList").html("");
        myIP = data;
    }).error(function(jqXHR, textStatus, errorThrown) {
        console.log("< histocolaiDBIP resolve: ERROR, " + textStatus + ", " + errorThrown);
        $("#regionList").html("<br />Error: Unable to connect to database.");
    });
}

function save() {
    if( debug ) console.log("> save");

    var i;
    var obj;
    var el;

    obj = {};
    obj.Regions = [];
    for( i = 0; i < ImageInfo[currentImage]["Regions"].length; i++ )
    {
        el = {};
        el.path = ImageInfo[currentImage]["Regions"][i].path.exportJSON();
        el.name = ImageInfo[currentImage]["Regions"][i].name;
        obj.Regions.push(el);
    }
    localStorage.histocolai = JSON.stringify(obj);

    if( debug ) console.log("+ saved regions:",ImageInfo[currentImage]["Regions"].length);
}

function load() {
    if( debug ) console.log("> load");

    var i,obj,reg;
    if( localStorage.histocolai ) {
        console.log("Loading data from localStorage");
        obj = JSON.parse(localStorage.histocolai);
        for( i = 0; i < obj.Regions.length; i++ ) {
            var reg = {};
            var json;
            reg.name = obj.Regions[i].name;
            json = obj.Regions[i].path;
            reg.path = new paper.Path();
            reg.path.importJSON(json);
            newRegion({name:reg.name,path:reg.path});
        }
        paper.view.draw();
    }
}


/***5
    Initialisation
*/

function loadImage(name) {
    if( debug ) console.log("> loadImage(" + name + ")");
    
    if(window.location.href.indexOf("crowdsourcing_3") > -1){
        timerSlice.pause();
        sliceTime("loadImage");        
        setTimeout(timerSlice.stop(),100);
        setTimeout(timerSlice.start(),100);
    }
    // save previous image for some (later) cleanup
    prevImage = currentImage;

    // F170710: to remove drawing tools in case of guest user or add them otherwise
    checkGuestUser(); // better done here than in histocolaiDBLoad() (executes later)
    // F180525: TODO this should be done only once at the begining of page loading

    // F161121: added checkbox to say if annotation is finished
    // ("#annotation-ended")[0]['checked'] = false;
    // F180525: this is not really needed, as line 1653 assignts the value stored in the DB: $("#annotation-ended")[0]['checked'] = ImageInfo[currentImage]["finished"];

    // F180525: to remove "copy to" functionality if not "auto" user or anotación finalizada = true
    // checkAutoUser(); // must be done after loading image annotations to see if annotations is finished or not

    // set current image to new image
    currentImage = name;

    viewer.open(ImageInfo[currentImage]["source"]);
}

function loadNextImage() {
    if( debug ) console.log("> loadNextImage");
    var index = imageOrder.indexOf(currentImage);
    var nextIndex = (index + 1) % imageOrder.length;

    // update image slider
    update_slider_value(nextIndex);

    loadImage(imageOrder[nextIndex]);

}

function loadPreviousImage() {
    console.log("> loadPrevImage");
    var index = imageOrder.indexOf(currentImage);
    var previousIndex = ((index - 1 >= 0)? index - 1 : imageOrder.length - 1 );

    // update image slider
    update_slider_value(previousIndex);

    loadImage(imageOrder[previousIndex]);

}


function resizeAnnotationOverlay() {
    if( debug ) console.log("> resizeAnnotationOverlay");

    var width = $("body").width();
    var height = $("body").height();
    $("canvas.overlay").width(width);
    $("canvas.overlay").height(height);
    paper.view.viewSize = [width,height];
}

function initAnnotationOverlay(data) {
    if( debug ) console.log("> initAnnotationOverlay");

    // do not start loading a new annotation if a previous one is still being loaded
    if(annotationLoadingFlag==true) {
        return;
    }

    // change myOrigin (for loading and saving)
    myOrigin.slice = currentImage;

    // hide previous slice
    if( prevImage && paper.projects[ImageInfo[prevImage]["projectID"]] ) {
        paper.projects[ImageInfo[prevImage]["projectID"]].activeLayer.visible = false;
        $(paper.projects[ImageInfo[prevImage]["projectID"]].view.element).hide();
    }

    // if this is the first time a slice is accessed, create its canvas, its project,
    // and load its regions from the database
    if( ImageInfo[currentImage]["projectID"] == undefined ) {

        // create canvas
        var canvas = $("<canvas class='overlay' id='" + currentImage + "'>");
        $("body").append(canvas);

        // create project
        paper.setup(canvas[0]);
        ImageInfo[currentImage]["projectID"] = paper.project.index;

        // load regions from database
        if( config.useDatabase ) {
            histocolaiDBLoad()
            .then(function(){
                $("#regionList").height($(window).height() - $("#regionList").offset().top);
                updateRegionList();
                paper.view.draw();
            });
        }

        if( debug ) console.log('Set up new project, currentImage: ' + currentImage + ', ID: ' + ImageInfo[currentImage]["projectID"]);
    }

    // activate the current slice and make it visible
    paper.projects[ImageInfo[currentImage]["projectID"]].activate();
    paper.project.activeLayer.visible = true;
    $(paper.project.view.element).show();

    // resize the view to the correct size
    var width = $("body").width();
    var height = $("body").height();
    paper.view.viewSize = [width, height];
    paper.settings.handleSize = 10;
    updateRegionList();
    paper.view.draw();

    // F161121: added checkbox to say if annotation is finished
    $("#annotation-ended")[0]['checked'] = ImageInfo[currentImage]["finished"];

    // F180525: to remove "copy to" functionality if not "auto" user or anotación finalizada = true
    checkAutoUser(); // must be done after loading image annotations to see if annotations is finished or not

    /* RT: commenting this line out solves the image size issues */
    // set size of the current overlay to match the size of the current image
    magicV = viewer.world.getItemAt(0).getContentSize().x / 100;

    transform();
}

function transform() {
    var z = viewer.viewport.viewportToImageZoom(viewer.viewport.getZoom(true));
    var sw = viewer.source.width;
    var bounds = viewer.viewport.getBounds(true);
    var x = magicV * bounds.x;
    var y = magicV * bounds.y;
    var w = magicV * bounds.width;
    var h = magicV * bounds.height;
    paper.view.setCenter(x + w / 2, y + h / 2);
    paper.view.zoom=(sw * z) / magicV;
}

function deparam() {
    if( debug ) console.log("> deparam");

    var search = location.search.substring(1);
    var result = search?JSON.parse('{"' + search.replace(/&/g, '","').replace(/=/g,'":"') + '"}',
                     function(key, value) { return key===""?value:decodeURIComponent(value) }):{};
    if( debug ) console.log("url parametres:",result);

    return result;
}

function loginChanged() {
    if( debug ) console.log("> loginChanged");
    setTimeout(updateUser(),100);
    if(window.location.href.indexOf("crowdsourcing_3") > -1){batchTime()};
    paper.projects[ImageInfo[currentImage]["projectID"]].activeLayer.visible = false;
    $(paper.projects[ImageInfo[currentImage]["projectID"]].view.element).hide();
    for( var i = 0; i < imageOrder.length; i++ ){

        ImageInfo[imageOrder[i]]["Regions"] = [];
        if( ImageInfo[imageOrder[i]]["projectID"] != undefined ) {
            paper.projects[ImageInfo[imageOrder[i]]["projectID"]].clear();
            paper.projects[ImageInfo[imageOrder[i]]["projectID"]].remove();
            ImageInfo[imageOrder[i]]["projectID"] = undefined;
        }
        $("<canvas class='overlay' id='" + currentImage + "'>").remove();
    }

    viewer.open(ImageInfo[currentImage]["source"]);
}

function updateUser() {
    if( debug ) console.log("> updateUser");
    if( MyLoginWidget.username )
        myOrigin.user = MyLoginWidget.username;
    else {
        var username = {};
        username.IP = myIP;
        username.hash = hash(navigator.userAgent).toString(16);
        myOrigin.user = username;
    }
}

function makeSVGInline() {
    if( debug ) console.log("> makeSVGInline promise");

    var def = $.Deferred();
    $('img.button').each(function() {
        var $img = $(this);
        var imgID = $img.attr('id');
        var imgClass = $img.attr('class');
        var imgURL = $img.attr('src');

        $.get(imgURL, function(data) {
            // Get the SVG tag, ignore the rest
            var $svg = $(data).find('svg');

            // Add replaced image's ID to the new SVG
            if( typeof imgID !== 'undefined' ) {
                $svg = $svg.attr('id', imgID);
            }
            // Add replaced image's classes to the new SVG
            if( typeof imgClass !== 'undefined' ) {
                $svg = $svg.attr('class', imgClass + ' replaced-svg');
            }

            // Remove any invalid XML tags as per http://validator.w3.org
            $svg = $svg.removeAttr('xmlns:a');

            // Replace image with new SVG
            $img.replaceWith($svg);

            if( debug ) console.log("< makeSVGInline resolve: success");
            def.resolve();
        }, 'xml');
    });

    return def.promise();
}

function updateSliceName() {
    $("#slice-name").val(currentImage);
    var slash_index = params.source.lastIndexOf("/") + 1;
    var filename    = params.source.substr(slash_index);
    $("title").text("histocolai|" + filename + "|" + currentImage);
    writeComments();
}

function initShortCutHandler() {
    $(document).keydown(function(e) {
        var key = [];
        if( e.ctrlKey ) key.push("^");
        if( e.altKey ) key.push("alt");
        if( e.shiftKey ) key.push("shift");
        if( e.metaKey ) key.push("cmd");
        key.push(String.fromCharCode(e.keyCode));
        key = key.join(" ");
        if( shortCuts[key] ) {
            var callback = shortCuts[key];
            callback();
            e.preventDefault();
        }
    });
}

function shortCutHandler(key,callback) {
    var key = isMac?key.mac:key.pc;
    var arr = key.split(" ");
    for( var i = 0; i < arr.length; i++ ) {
        if( arr[i].charAt(0) == "#" ) {
            arr[i] = String.fromCharCode(parseInt(arr[i].substring(1)));
        } else
        if( arr[i].length == 1 ) {
            arr[i] = arr[i].toUpperCase();
        }
    }
    key = arr.join(" ");
    shortCuts[key] = callback;
}

function initSlider(min_val, max_val, step, default_value) {
/*
    Initializes a slider to easily change between slices
*/
    if( debug ) console.log("> initSlider promise");
    var slider = $("#slider");
    if( slider.length > 0 ) { // only if slider could be found
        slider.attr("min", min_val);
        slider.attr("max", max_val - 1);
        slider.attr("step", step);
        slider.val(default_value);

        slider.on("change", function() {
            slider_onchange(this.value);
        });

        // Input event can only be used when not using database, otherwise the annotations will be loaded several times
        // TODO fix the issue with the annotations for real
        if (config.useDatabase == false) {
            slider.on("input", function() {
                slider_onchange(this.value);
            });
        }
    }
		var sliceName = $("#slice-name-text");
		var sliceName2 = $("#slice-name-text-leti"); /* línea añadida Leti to access an image directly with its name instead of its position */
		if( sliceName.length > 0 ) { // only if slider could be found
        var imagePath = self.ImageInfo[default_value].source;
        imagePathParts = imagePath.split("/")[imagePath.split("/").length-1].split("_"); //just until the first underscore. Before: (imagePath.split("/"));
        sliceName.val(imagePathParts[0] + '_' + imagePathParts[1] + '_' + imagePathParts[2]);
		}
        /* añadido Leti 
            Possibility for the user to change directly the name of the image,
            allowing to access to specific images of the batch without having to 
            refer to the corresponding position in the batch.
        */
		if( sliceName2.length > 0 ) { // only if slider could be found
        var imagePath = self.ImageInfo[default_value].source;
        imagePathParts = imagePath.split("/")[imagePath.split("/").length-1].split("_"); 
        sliceName2.val(imagePathParts[0] + '_' + imagePathParts[1] + '_' + imagePathParts[2]);
		}
        /* final añadido Leti */

}

function slider_onchange(newImageIndex) {
/*
    Called when the slider value is changed to load a new slice
*/
    if( debug ) console.log("> slider_onchange promise");
    var imageNumber = imageOrder[newImageIndex];
    loadImage(imageNumber);

    var sliceName = $("#slice-name-text");
    var sliceName2 = $("#slice-name-text-leti"); /* línea añadida Leti */
    if( sliceName.length > 0 ) { // only if slider could be found
        var imagePath = self.ImageInfo[newImageIndex].source;
        imagePathParts = imagePath.split("/")[imagePath.split("/").length-1].split("_"); 
        sliceName.val(imagePathParts[0] + '_' + imagePathParts[1] + '_' + imagePathParts[2]);
    }
    /* añadido Leti 
        Possibility for the user to change directly the name of the image,
        allowing to access to specific images of the batch without having to 
        refer to the corresponding position in the batch.
    */
    if( sliceName2.length > 0 ) { // only if slider could be found
        var imagePath = self.ImageInfo[newImageIndex].source;
        imagePathParts = imagePath.split("/")[imagePath.split("/").length-1].split("_"); //just until the first underscore. Before: (imagePath.split("/"));
        sliceName2.val(imagePathParts[0] + '_' + imagePathParts[1] + '_' + imagePathParts[2]);
    }
    /* final añadido Leti */
    disableDraw();
}

function update_slider_value(newIndex) {
/*
    Used to update the slider value if the slice was changed by another control
*/
    if( debug ) console.log("> update_slider_value promise");
    
    var slider = $("#slider");
    if( slider.length > 0 ) { // only if slider could be found
        slider.val(newIndex);
    }
		// write also image name
    var sliceName = $("#slice-name-text");
    var sliceName2 = $("#slice-name-text-leti"); /* línea añadida Leti */
    if( sliceName.length > 0 ) { // only if slider could be found
        var imagePath = self.ImageInfo[newIndex].source;
        imagePathParts = imagePath.split("/")[imagePath.split("/").length-1].split("_"); //just until the first underscore. Before: (imagePath.split("/"));
        sliceName.val(imagePathParts[0] + '_' + imagePathParts[1] + '_' + imagePathParts[2]);
    }
    /* añadido Leti 
        Possibility for the user to change directly the name of the image,
        allowing to access to specific images of the batch without having to 
        refer to the corresponding position in the batch.
    */
    if( sliceName2.length > 0 ) { // only if slider could be found
        var imagePath = self.ImageInfo[newIndex].source;
        imagePathParts = imagePath.split("/")[imagePath.split("/").length-1].split("_"); //just until the first underscore. Before: (imagePath.split("/"));
        sliceName2.val(imagePathParts[0] + '_' + imagePathParts[1] + '_' + imagePathParts[2]);
    }
    /* final añadido Leti */
    writeComments();
}

function find_slice_number(number_str) {
/*
    Searches for the given slice-number.
    If the number could be found its index will be returned. Otherwise -1
*/
    var number = parseInt(number_str); // number = NaN if cast to int failed!
    if( !isNaN(number) ) {
        for( i = 0; i < imageOrder.length; i++ )  {
                var slice_number = parseInt(imageOrder[i]);
                // Compare the int values because the string values might be different (e.g. "0001" != "1")
                if( number == slice_number ) {
                    return i;
                }
        }
    }

    return -1;
}
/* Funciones Leti 
    Possibility for the user to change directly the name of the image,
    allowing to access to specific images of the batch without having to 
    refer to the corresponding position in the batch.
*/
function find_slice_number_with_name(name_str) {
/*
    Searches for the given slice-number based on the image name written by the user.
    If the number could be found its index will be returned. Otherwise -1
*/

    for( i = 0; i < imageOrder.length; i++ )  {
            var current_name = ImageInfo[i].source;
            // Compare the int values because the string values might be different (e.g. "0001" != "1")
            if( name_str == current_name.split("/")[2] ) {
                return i;
            }
    }
    return -1;
}

function slice_name_text_onenter(event) {
    /*
        Eventhandler to open a specific slice by the enter key
    */
        if( debug ) console.log("> slice_name_text_onenter promise");
        if( event.keyCode == 13 ) { // enter key
            var slice_name = $(this).val();
            var index = find_slice_number_with_name(slice_name);
            
            if( index > -1 ) { // if slice number exists
                update_slider_value(index);
                loadImage(imageOrder[index]);
            }
            else{
                /*
                    If the image index was not found, inform the user and change the name back to what it was before changing it.
                */
                alert("Image did not change");
                var local_index = $("#slice-name").val();
                update_slider_value(local_index);
            }
        }
        event.preventDefault(); // prevent the default action (scroll / move caret)
    }
/* Final funciones Leti */

function slice_name_onenter(event) {
/*
    Eventhandler to open a specific slice by the enter key
*/
    if( debug ) console.log("> slice_name_onenter promise");
    if( event.keyCode == 13 ) { // enter key
        var slice_number = $(this).val();
        var index = find_slice_number(slice_number);
        if( index > -1 ) { // if slice number exists
            update_slider_value(index);
            loadImage(imageOrder[index]);
        }
    }
    event.preventDefault(); // prevent the default action (scroll / move caret)
}

function loadConfiguration() {
    var def = $.Deferred();
    // load general histocolai configuration
    $.getJSON("configuration.json", function(data) {
        config = data;

        drawingTools = ["select", "draw", "draw-polygon", "simplify", "addpoint",
                        "delpoint", "addregion", "delregion", "splitregion", "rotate",
                        "save", "copy", "paste", "delete"];

        if( config.drawingEnabled == false ) {
            // remove drawing tools from ui
            for( var i = 0; i < drawingTools.length; i++ ){
                $("#" + drawingTools[i]).remove();
            }

        }
        for( var i = 0; i < config.removeTools.length; i++ ) {
            $("#" + config.removeTools[i]).remove();
        }
        if( config.useDatabase == false ) {
            $("#save").remove();
        }
        def.resolve();
    });

    return def.promise();
}

// F170710: function to check if user is guest and remove tools
function checkGuestUser() {
    var def = $.Deferred();
    // load general histocolai configuration
    $.getJSON("configuration.json", function(data) {
        config = data;

        drawingTools = ["select", "draw", "draw-polygon", "simplify", "addpoint",
                        "delpoint", "addregion", "delregion", "splitregion", "rotate",
                        "save", "copy", "paste", "delete"];
        if(MyLoginWidget.username == "guest") {
            // remove drawing tools from ui
            for( var i = 0; i < drawingTools.length; i++ ) {
                $("#" + drawingTools[i]).remove();
            }
        }

        def.resolve();
    });

    return def.promise();
}

// 180522: function to check if user is auto and remove "copy to" tool
function checkAutoUser() {
    if(MyLoginWidget.username != "auto" || $("#annotation-ended")[0]['checked'] == false) {
        $("#copy_annotations_to").hide();
    }else{
        $("#copy_annotations_to").show();
    }
}

function inithistocolai() {
    if( debug ) console.log("> inithistocolai promise");
    
    var def = $.Deferred();

    // Subscribe to login changes
    MyLoginWidget.subscribe(loginChanged);

    // Enable click on toolbar buttons
    $("img.button").click(toolSelection);

    // set annotation loading flag to false
    annotationLoadingFlag = false;

    // Initialize the control key handler and set shortcuts
    initShortCutHandler();
    shortCutHandler({pc:'^ z',mac:'cmd z'},cmdUndo);
    shortCutHandler({pc:'^ y',mac:'cmd y'},cmdRedo);
    if( config.drawingEnabled ) {
        shortCutHandler({pc:'^ x',mac:'cmd x'},function() { console.log("cut!")});
        shortCutHandler({pc:'^ v',mac:'cmd v'},cmdPaste);
        shortCutHandler({pc:'^ a',mac:'cmd a'},function() { console.log("select all!")});
        shortCutHandler({pc:'^ c',mac:'cmd c'},cmdCopy);
        shortCutHandler({pc:'#46',mac:'#8'},cmdDeleteSelected);  // delete key
    }
    shortCutHandler({pc:'#37',mac:'#37'},loadPreviousImage); // left-arrow key
    shortCutHandler({pc:'#39',mac:'#39'},loadNextImage);     // right-arrow key

    // Configure currently selected tool
    selectedTool = "Zoom";
    selectTool();

	// decide between json (local) and jsonp (cross-origin)
	var ext = params.source.split(".");
	ext = ext[ext.length - 1];
	if( ext == "jsonp" ) {
		if( debug )
			console.log("Reading cross-origin jsonp file");
		$.ajax({
			type: 'GET',
			url: params.source+"?callback=?",
			jsonpCallback: 'f',
			dataType: 'jsonp',
			contentType: "application/json",
			success: function(obj){inithistocolai2(obj);def.resolve()}
		});
	} else
	if( ext == "json" ) {
		if( debug )
			console.log("Reading local json file");
		$.ajax({
			type: 'GET',
			url: params.source,
			dataType: "json",
            contentType: "application/json",
			success: function(obj){inithistocolai2(obj);def.resolve()}
		});
	}

    // Change current slice by typing in the slice number and pessing the enter key
    $("#slice-name").keyup(slice_name_onenter);
    
    /* añadido Leti */
    $("#slice-name-text-leti").keyup(slice_name_text_onenter);
    /* final añadido Leti */


    // Show and hide menu
    if( config.hideToolbar ) {
        var mouse_position;
        var animating = false;
        $(document).mousemove(function (e) {
            if( animating ) {
                return;
            }
            mouse_position = e.clientX;

            if( mouse_position <= 100 ) {
                //SLIDE IN MENU
                animating = true;
                $('#menuBar').animate({
                    left: 0,
                    opacity: 1
                }, 200, function () {
                    animating = false;
                });
            } else if( mouse_position > 200 ) {
                animating = true;
                $('#menuBar').animate({
                    left: -100,
                    opacity: 0
                }, 500, function () {
                    animating = false;
                });
            }
        });
    }

    $(window).resize(function() {
        $("#regionList").height($(window).height() - $("#regionList").offset().top);
        resizeAnnotationOverlay();
    });

    if(window.location.href.indexOf("batch_spitzoides_nests") > -1)
    {
     appendRegionTagsFromOntology(OntologyNests);
      $("#slice-name-text").show() 
    }
    
    else if(window.location.href.indexOf("spitzo") > -1)
    {
      appendRegionTagsFromOntology(OntologySpitzoides);
      $("#slice-name-text").show();
    }
    if(window.location.href.indexOf("crowdsourcing")> -1)
    {

      appendRegionTagsFromOntology(crowdsourcing);  
      appendlabaleConvictionFromOntology(labels);
      $("#draw-polygon").remove();
      $("#resident").show();
      $("#slice-name-text-leti").remove();
      $("#sendConviction").show();
      $("#annotation-label").hide();
      $("#glob_label").remove();
      $("#slice-name-text").hide();


    }
    else if(window.location.href.indexOf("AI4SKIN") > -1)
    {
      appendRegionTagsFromOntology(OntologyAI4SKIN);
      $("#slice-name-text").show();
    }
    else if(window.location.href.indexOf("vegetation") > -1)
    {
      appendRegionTagsFromOntology(vegetation);
      $("#slice-name-text").show();
    }
    else if(window.location.href.indexOf("TNBC_CLARIFY") > -1)
    {
      appendRegionTagsFromOntology(OntologyTNBC);
    }
    else if(window.location.href.indexOf("TNBC") > -1)
    {
      appendRegionTagsFromOntology(tnbc);
      $("#slice-name-text").show();
    }
    else if(window.location.href.indexOf("PICASSO") > -1)
    {
      appendRegionTagsFromOntology(picasso);
      $("#slice-name-text").show();
    }
    else if(window.location.href.indexOf("batch_vejiga") > -1)
    {
      appendRegionTagsFromOntology(OntologyVejiga);
      $("#slice-name-text").show();
    }
    else{
      $("#slice-name-text").show();
    }
    
    // F161121: added checkbox to say if annotation is finished
    $("#annotation-ended").on("click", function(event) {
        ImageInfo[currentImage]["finished"] = $("#annotation-ended")[0]['checked'];
        ImageInfo[currentImage]["needToSave"] = true;
        changesSaved = false;

        // F180525: if checked = true, show copy to box
        if($("#annotation-ended")[0]['checked'] == false) {
            // remove "copy to"
            $("#copy_annotations_to").hide();
        }else{
            $("#copy_annotations_to").show();
        }
    });

    // F180525: assign function copyAnnotationFromAutoTo(user_to_copy_to) to "copy" button
    $("#btn_copy_annotations_to").on("click", function(event) {
        var user_to_copy_to = $("#sel_user option:selected").text();
        copyAnnotationFromAutoTo(user_to_copy_to);
    });

    return def.promise();
}

function inithistocolai2(obj) {

	if( debug ) console.log("json file:",obj);

	// for loading the bigbrain
	if( obj.tileCodeY ) {
		obj.tileSources = eval(obj.tileCodeY);
	}

	// set up the ImageInfo array and imageOrder array
	for( var i = 0; i < obj.tileSources.length; i++ ) {
		// name is either the index of the tileSource or a named specified in the json file
		var name = ((obj.names && obj.names[i]) ? String(obj.names[i]) : String(i));
		imageOrder.push(name);
		ImageInfo[name] = {"source": obj.tileSources[i], "Regions": [], "projectID": undefined};
		//F161121: added checkbox to say if annotation is finished
		ImageInfo[name]["finished"] = false;
		ImageInfo[name]["needToSave"] = false;
		// if getTileUrl is specified, we might need to eval it to get the function
		if( obj.tileSources[i].getTileUrl && typeof obj.tileSources[i].getTileUrl === 'string' ) {
			eval("ImageInfo[name]['source'].getTileUrl = " + obj.tileSources[i].getTileUrl);
		}
	}

    // set default values for new regions (general configuration)
    if (config.defaultStrokeColor == undefined) config.defaultStrokeColor = 'black';
    if (config.defaultStrokeWidth == undefined) config.defaultStrokeWidth = 1;
    if (config.defaultFillAlpha == undefined) config.defaultFillAlpha = 0.5;
    // set default values for new regions (per-brain configuration)
    if (obj.configuration) {
        if (obj.configuration.defaultStrokeColor != undefined) config.defaultStrokeColor = obj.configuration.defaultStrokeColor;
        if (obj.configuration.defaultStrokeWidth != undefined) config.defaultStrokeWidth = obj.configuration.defaultStrokeWidth;
        if (obj.configuration.defaultFillAlpha != undefined) config.defaultFillAlpha = obj.configuration.defaultFillAlpha;
    }

	// init slider that can be used to change between slides
	// initSlider(0, obj.tileSources.length, 1, Math.round(obj.tileSources.length / 2));
	// currentImage = imageOrder[Math.floor(obj.tileSources.length / 2)];
    initSlider(0, obj.tileSources.length, 1, 0);
	currentImage = "0";

	params.tileSources = obj.tileSources;
	viewer = OpenSeadragon({
		id: "openseadragon1",
		prefixUrl: "lib/openseadragon/images/",
		tileSources: [],
		showReferenceStrip: false,
		referenceStripSizeRatio: 0.2,
		showNavigator: true,
		sequenceMode: false,
		navigatorId:"myNavigator",
		zoomInButton:"Zoomin",
		zoomOutButton:"Zoomout",
		homeButton:"Home",
		preserveViewport: true
	});

	// open the currentImage
	viewer.open(ImageInfo[currentImage]["source"]);

	// add the scalebar
	viewer.scalebar({
		type: OpenSeadragon.ScalebarType.MICROSCOPE,
		minWidth:'150px',
		pixelsPerMeter:obj.pixelsPerMeter,
		color:'black',
		fontColor:'black',
		backgroundColor:"rgba(255,255,255,0.5)",
		barThickness:4,
		location: OpenSeadragon.ScalebarLocation.TOP_RIGHT,
		xOffset:5,
		yOffset:5
	});

	// add handlers: update slice name, animation, page change, mouse actions
	viewer.addHandler('open',function(){
		initAnnotationOverlay();
		updateSliceName();
	});
	viewer.addHandler('animation', function(event){
		transform();
	});
	viewer.addHandler("page", function (data) {
		console.log(data.page,params.tileSources[data.page]);
	});
	viewer.addViewerInputHook({hooks: [
		{tracker: 'viewer', handler: 'clickHandler', hookHandler: clickHandler},
		{tracker: 'viewer', handler: 'pressHandler', hookHandler: pressHandler},
		{tracker: 'viewer', handler: 'dragHandler', hookHandler: dragHandler},
		{tracker: 'viewer', handler: 'dragEndHandler', hookHandler: dragEndHandler}
	]});
    writeComments();
	if( debug ) console.log("< inithistocolai2 resolve: success");
    if(window.location.href.indexOf("crowdsourcing_3") > -1){batchTime();}
}

function toggleMenu () {
    if( $('#menuBar').css('display') == 'none' ) {
        $('#menuBar').css('display', 'block');
        $('#menuButton').css('display', 'none');
    }
    else {
        $('#menuBar').css('display', 'none');
        $('#menuButton').css('display', 'block');
    }
}

$(function() {
    $.when(
        loadConfiguration()
    ).then(function(){
        if( config.useDatabase ) {
            $.when(
                histocolaiDBIP(),
                MyLoginWidget.init()
            ).then(function(){
                params = deparam();
                myOrigin.appName = "histocolai";
                myOrigin.slice = currentImage;
                myOrigin.source = params.source;
                updateUser();
            }).then(inithistocolai);
        } else {
            params = deparam();
            inithistocolai();
        }
    });
});

$("#annotation-label").add("#annotation-observation").on('change',function(){

  $.ajax({
      url:dbroot,
      type:"POST",
      data: {
        "action":"save_label",
        "origin":JSON.stringify({
            user : myOrigin.user,
            slice : myOrigin.source.replace("dzi_images.json","") + $("#slice-name-text").val(),
            observation : $("#annotation-observation").val(),
            label : $("#annotation-label").val()
        })
      },
      success: function(data) {
          console.log("annotation-label: Successfully saved label: ",myOrigin.source.replace("dzi_images.json","") + $("#slice-name-text").val());
      },
      error: function(jqXHR, textStatus, errorThrown) {
          console.log("< resolve: ERROR: " + textStatus + " " + errorThrown,"slice: "+root);
      }
    });

});



function writeComments(){

    /* Código para leer los niveles de confianza de los residentes 22/09/21 */
    if(window.location.href.indexOf("crowdsourcing") > -1){
        $('#drop-down-label1').val("");
        $('#confidence').val(0);

        $('#drop-down-label2').val("");
        $('#confidence2').val(0);
        $('#resident2').hide();

        $('#drop-down-label3').val("");
        $('#confidence3').val(0);
        $('#resident3').hide();

        $("#annotation-label").hide();

        $.get(dbroot,{
        "action":"load_conviction",
        "origin":JSON.stringify({
            user : myOrigin.user,
            slice : myOrigin.source.replace("dzi_images.json","") + $("#slice-name-text").val()
            })
        }).success(function(data) {

            if(data.length != 0)
            {
                console.log(data);
                var x = JSON.parse(data);
                var y = JSON.parse(x.conviction);

                $('#drop-down-label1').val(y.etiqueta1.label);
                $('#confidence').val(y.etiqueta1.conviction);

                if(y.etiqueta1.conviction !="100")
                {
                    $('#confidence2').empty();
                    $('#confidence2').append(`<option value=0 selected >0</option>`);
                    $('#confidence3').append(`<option value=0 selected >0</option>`)
                    $('#resident2').show();
                    
                    $('#drop-down-label2').val(y.etiqueta2.label);
                    $('#confidence2').append(`<option value="${y.etiqueta2.conviction}">${y.etiqueta2.conviction}</option>`)
                    $('#confidence2').val(y.etiqueta2.conviction);
                    
                    if (y.etiqueta3.conviction != '0')
                    {
                        $('#confidence3').empty();
                        $('#confidence3').append(`<option value=0 selected >0</option>`); 
                        $('#resident3').show();

                        $('#drop-down-label3').val(y.etiqueta3.label);
                        $('#confidence3').append(`<option value="${y.etiqueta3.conviction}">${y.etiqueta3.conviction}</option>`)
                        $('#confidence3').val(y.etiqueta3.conviction);
                    }
                }
            }

        }).error(function(jqXHR, textStatus, errorThrown) {
                console.log("< histocolaiDBLoad resolve ERROR: " + textStatus + " " + errorThrown);
                annotationLoadingFlag = false;
        });

    }
    /** Código para leer los comentarios y observacines */
    else{
        $('#annotation-label').val('');
        $('#annotation-observation').val('');
        $.get(dbroot,{
        "action":"load_label",
        "origin":JSON.stringify({
            user : myOrigin.user,
            slice : myOrigin.source.replace("dzi_images.json","") + $("#slice-name-text").val()
            })
        }).success(function(data) {
            var x = JSON.parse(data);
            $('#annotation-label').val(x.Label);
            $('#annotation-observation').val(x.Observation);
        }).error(function(jqXHR, textStatus, errorThrown) {
                console.log("< histocolaiDBLoad resolve ERROR: " + textStatus + " " + errorThrown);
                annotationLoadingFlag = false;
        });
    }
}


setInterval(function(){

    console.log(newRegionFlag);
    if(newRegionFlag){console.log("time out for auto save but drawing procces is trigering");}
    else{
        histocolaiDBSave();
    }
   
}, 300000);

//Add by cristian for show drop-down, and confidence 20/07/2021
$("#confidence").on('change',function(){

    // cast confidence value to int
    var conf = Number.parseInt(document.getElementById('confidence').value);
    $('#confidence2').empty();
    $('#confidence3').empty();
    $('#confidence2').append(`<option value=0 selected >0</option>`);
    $('#confidence3').append(`<option value=0 selected >0</option>`);

    if(conf < 100){
        $('#resident2').show();
        var rest = (100 - conf)/10;
        for(let i=1; i <= rest; i++)
        {
            $('#confidence2').append(`<option value="${i*10}">${i*10}</option>`);
        }
        $('#resident3').hide();    
    }
    else if((conf+Number.parseInt(document.getElementById('confidence2').value)) >= 100 ) { 
        $('#resident2').hide();
        $('#resident3').hide();       
    }
    else if(conf == 100)
    {
        $('#resident2').hide();
        $('#resident3').hide();
    
    }


});

$("#confidence2").on('click',function(){
   
    var conf = Number.parseInt(document.getElementById('confidence').value);
    var conf2 = Number.parseInt(document.getElementById('confidence2').value);
    $('#confidence3').empty();
    if(conf+conf2 < 100){
        
        for(let i=1; i <= rest; i++)
        {
            $('#confidence2').append(`<option value="${i*10}">${i*10}</option>`);
        }  
        $('#resident3').show();
        var rest = 100 - (conf+conf2 );
        $('#confidence3').append(`<option value="${rest}">${rest}</option>`)
         
    }
    else{
        $('#resident3').hide();
        $('#confidence3').append(`<option value=0 selected >0</option>`);
        
    }
});
//*******************************************************************

//Add by cristian for save labels with drop-down 23/08/2021


function sendConviction(){

    var conv1 = parseInt(document.getElementById('confidence').value);
    var conv2 = parseInt(document.getElementById('confidence2').value);
    var conv3 = parseInt(document.getElementById('confidence3').value);

    if($("#drop-down-label1 option:selected").text()!=="" &&  $("#drop-down-label2 option:selected").text()==="" && $("#drop-down-label3 option:selected").text()==="" && conv1+conv2+conv3==100)
    {
            saveDBConviction();
    }
    else if(!$("#drop-down-label1 option:selected").text() || conv1==0){
        alert("The global label and conviction fields must to be fill.");
    }
    else if($("#drop-down-label1 option:selected").text()===$("#drop-down-label2 option:selected").text() || $("#drop-down-label2 option:selected").text()===$("#drop-down-label3 option:selected").text()
        || $("#drop-down-label1 option:selected").text()===$("#drop-down-label3 option:selected").text())
    {
        alert("The global labels should be different.");
        
    }
    else{
        if(conv1+conv2+conv3==100 && conv1 >= conv2 && conv1 > conv3 && conv2 >= conv3) 
        {
            saveDBConviction();
        }
        else{
            alert("There is an issue with your suggestion, please check if the sum of the convictions is iqual to 100 and if the percentage is in descending order.");
        }
    }
  }

  function appendlabaleConvictionFromOntology(o) {
    if( debug ) console.log("> appendRegionTagsFromOntology");

    for( var i = 0; i < o.length; i++ ) {
        if( o[i].parts ) {
            for(var j = 0; j < o[i].parts.length; j++ ){
                $('#drop-down-label1').append(`<option value="${o[0].parts[j].name}">${o[0].parts[j].name}</option>`)
                $('#drop-down-label2').append(`<option value="${o[0].parts[j].name}">${o[0].parts[j].name}</option>`)
                $('#drop-down-label3').append(`<option value="${o[0].parts[j].name}">${o[0].parts[j].name}</option>`)
            }
            
            appendlabaleConvictionFromOntology(o[i].parts);
        }
    }
}

function saveDBConviction(){
    $.ajax({
        url:dbroot,
        type:"POST",
        dataType: "json",
        data: {
        "action":"conviction",
        "origin":JSON.stringify({
            user : myOrigin.user,
            slice : myOrigin.source.replace("dzi_images.json","") + $("#slice-name-text").val(),
            observation : JSON.stringify({
                etiqueta1:{                            
                    "label": $("#drop-down-label1 option:selected").text(),
                    "conviction":document.getElementById('confidence').value
                    },
                etiqueta2:{                            
                    "label": $("#drop-down-label2 option:selected").text(),
                    "conviction":document.getElementById('confidence2').value
                    },
                etiqueta3:{                            
                    "label": $("#drop-down-label3 option:selected").text(),
                    "conviction":document.getElementById('confidence3').value
                }    
            }),
        })
        },
        success: function(data) {
            console.log("Conviction: Successfully saved label ");
            $('#saveDialog').html("Saving Confidence...").fadeIn();
                setTimeout(function() { $("#saveDialog").fadeOut(0);},1500);
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.log("< resolve: ERROR: " + textStatus + " " + errorThrown,"slice: "+root);
        }
    });
}

function disableDraw(){
    if( debug ) console.log(">disbleDraw");
    var annotation ="";

    if(ImageInfo[currentImage]["Regions"].length != 0){
            for( i = 0; i < ImageInfo[currentImage]["Regions"].length; i++ ) {
                annotation = ImageInfo[currentImage]["Regions"][i].name;
                if(annotation.split("Untitled").length > 1 ){
                    if(window.location.href.indexOf("crowdsourcing") > -1){
                        $('#draw').hide();
                        $('#draw-polygon').hide();
                        $('#delete').hide();
                        break;
                    }
                    else{
                        break;
                    }
                }
                else{
                    if(window.location.href.indexOf("crowdsourcing") > -1){
                        $('#draw').show();
                        $('#draw-polygon').show();
                        $('#delete').show();
                    }
                }
            }
        }
    else{
        $('#draw').show(); 
        $('#draw-polygon').show();
        $('#delete').show();
    }
}

/* 
    Functions add it by cristian 16/04/22 in orther save the time of user by slide and batch 
*/

var timerBatch = new easytimer.Timer();
timerBatch.start();

/*Function for save batch Time*/
function batchTime(){
    
// Add time and normalized to hours
    var t = timerBatch.getTimeValues().hours+timerBatch.getTimeValues().minutes/60+timerBatch.getTimeValues().seconds/3600;
// if the user have been more than 3 minutes in the batch the time can be save it.
    timerBatch.pause();
    $.ajax({
        url:dbroot,
        type:"POST",
        dataType:"json",
        data:{
            "action":"save_batch_time",
            "origin":JSON.stringify({
                source:	 	myOrigin.source,
                user:   	myOrigin.user,
                time:       t,
            }),

        },
        success: function(data) {
            console.log("< histocolaiDBSave resolve: Successfully batchTime:","response:",data);
        },
        
        error: function(jqXHR, textStatus, errorThrown) {
            console.log("< histocolaiDBSave resolve: ERROR saveing batchTime: " + textStatus + " " + errorThrown);
        }
    });
    timerBatch.stop();
}


var timerSlice = new easytimer.Timer();
timerSlice.start();

/*Function for save slice Time*/
function sliceTime(action){
    // Add time and normalized to minutes
    timerSlice.pause();
    var t = timerSlice.getTimeValues().hours*60+timerSlice.getTimeValues().minutes+timerSlice.getTimeValues().seconds/60;
    if (t>0.16)
    {
        $.ajax({
            url:dbroot,
            type:"POST",
            dataType:"json",
            data:{
                "action":"save_slice_time",
                "origin":JSON.stringify({
                    slice:  	currentImage,
                    source:	 	myOrigin.source,
                    user:   	myOrigin.user,
                    time:       t,
                }),

            },
            success: function(data) {
                console.log("< histocolaiDBSave resolve: Successfully Slicetime save:","response:",data);
            },
            
            error: function(jqXHR, textStatus, errorThrown) {
                console.log("< histocolaiDBSave resolve: ERROR saveing Slicetime: " + textStatus + " " + errorThrown);
            }
        });
    }
    timerSlice.stop();

}

let inactivityTime = function () {
    let time;
    window.onload = resetTimer;
    document.onload = resetTimer;
    document.onmousemove = resetTimer;
    document.onmousedown = resetTimer; // touchscreen presses
    document.ontouchstart = resetTimer;
    document.onclick = resetTimer; // touchpad clicks
    document.onkeypress = resetTimer;
    document.addEventListener('scroll', resetTimer, true); // improved; see comments
    function logout() {
        if(window.location.href.indexOf("crowdsourcing_2") > -1)
        {
            batchTime();
            setTimeout(sliceTime("timeOut"),1000);
        }
        console.log("You are now logged out.");
    }
    function resetTimer() {
      clearTimeout(time);
      timerSlice.start();
      timerBatch.start();
      time = setTimeout(logout, 60000);
    }
};

inactivityTime();


// Function to save data before to close windows tab.
window.addEventListener("beforeunload", function (e) {

    if(window.location.href.indexOf("crowdsourcing_3") > -1)
    {
        timerSlice.pause();
        timerBatch.pause();
        batchTime();
        setTimeout(sliceTime("close"),1000);
    }
    setTimeout(histocolaiDBSave());
    for (var i = 0; i < 500000000; i++) { }
    return undefined;
  });

