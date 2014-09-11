/**
 * Requiere d3.js, jquery.js y TweenMax.js
 * @author Christian Gastrell
 */

function ArgenmapLiveGraph(opciones)
{
	this.longPolling = false;
	this.pollData = [];
	this.w = 400;
	this.h = 200;
	this.leftPadd = 20;
	this.rightPadd = 100;
	this.padding = 20;
	this.MAX_VALUE_Y = 10;
	this.MAX_POLLS = 50;
	this.selector = "#graph";
	this.lineColor = 'blue';
	this.lapCounter = 0;
	this.sourceUrl = 'argenmap_live.php';
	this.SESSION_SUFFIX = 'polling=true'
	this.POLL_INTERVAL = 2;

	this.f4d = d3.format('04d');
	this.f2d = d3.format('02d');
	this.svg; //elemento d3 svg
	this.container; //container general (g)
	this.lineContainer; //container de la linea (g)
	this.realTimeBoard; //container de la cantidad
	this.labelRequestsNuevos;
	this.labelClientes;
	this.eventSource;
	this.linearScaleY;
	this.linearScaleX;
	this.lineFunction;
	this.yAxis;
	this.onData = null;
	$.extend(this,opciones);
	this.initialize();
}
ArgenmapLiveGraph.prototype.initialize = function()
{
	this.buildScales();

	this.lineFunction = d3.svg.line()
		.x( $.proxy(function(d,i) { return this.linearScaleX(i); }),this)
		.y( $.proxy(function(d) { return this.linearScaleY(d.requestsNuevos); }),this)
		.interpolate("monotone");
	
	this.svg = d3.select(this.selector).append('svg')
		.attr('width',this.w)
		.attr('height',this.h)
		.style('background-color','black');

	this.container = this.svg.append('g')
		.attr('class','graph-container');

	this.axisContainer = this.svg.append('g')
		.attr('class','axis')
		.attr('opacity','0.3')
		.attr('transform','translate('+ (this.w) +','+ (this.h - this.padding) +')');

	this.buildAxis();

	this.lineContainer = this.svg.append('g')
		.attr('transform','translate(0,'+ (this.h - this.padding) +')')
		.attr('class','line-container');

	this.realTimeBoard = this.svg.append('g')
		.attr('transform','translate('+(this.w - this.rightPadd)+','+this.h / 2+')')
		.attr('class','label-container');
	this.labelRequestsNuevos = this.realTimeBoard.append('text')
		.attr('fill','white')
		.attr('font-size',80)
		.attr('font-family','Arial, Helvetica, sans-serif')
		.attr('style','opacity:0.6')
		.text('00');
	this.realTimeBoard.append('text')
		.attr('id','labelTiles')
		.attr('fill','#FEA')
		.attr('font-size',10)
		.attr('font-family','Arial, Helvetica, sans-serif')
		.attr('style','opacity:0.5')
		.text('TILES')
		.attr('transform','rotate(-90)');
	this.labelClientes = this.realTimeBoard.append('text')
		.attr('fill','white')
		.attr('y','40')
		.attr('x','85')
		.attr('font-size',40)
		.attr('text-anchor','end')
		.attr('font-family','Arial, Helvetica, sans-serif')
		.attr('style','opacity:0.6;')
		.text('0000');
	this.realTimeBoard.append('text')
		.attr('id','labelClientes')
		.attr('fill','#FEA')
		.attr('font-size',10)
		.attr('font-family','Arial, Helvetica, sans-serif')
		.attr('style','opacity:0.5')
		.text('REFERERS')
		.attr('y','50');

	this.connect();
}
ArgenmapLiveGraph.prototype.count = function(obj)
{
	var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
}
ArgenmapLiveGraph.prototype.getData = function()
{
	var live = this;
	var q = this.pollData.length ? 
		'?sid='+this.pollData[this.pollData.length - 1].processData.sessionId + '&' + this.SESSION_SUFFIX:
		'?' + this.SESSION_SUFFIX;
	$.ajax({
		url: this.sourceUrl + q,
		success: function(response) {
			// console.log(response);
			// return;
			//este kludge es horrible, pero es lo unico que tengo
			var a = response.substr(response.indexOf('data:') + 5);

			live.updateDataHandler({data:a});
			if(live.longPolling) {
				setTimeout($.proxy(live.getData,live), live.POLL_INTERVAL * 1000);
			}
		}
	});
}
ArgenmapLiveGraph.prototype.connect = function()
{
	if(this.longPolling)
	{
		this.getData();
	}else{
		this.eventSource = new EventSource(this.sourceUrl);
		// this.eventSource.addEventListener('error', function(e){console.log('error (close?)');console.log(e);})
		// this.eventSource.addEventListener('open', function(e){console.log('open');console.log(e);})
		this.eventSource.addEventListener('ping', $.proxy(this.updateDataHandler,this), false);
	}
}
ArgenmapLiveGraph.prototype.buildScales = function()
{
	this.linearScaleY = d3.scale.linear().domain([0,this.MAX_VALUE_Y]).range([0,-this.h + this.padding * 2]);
	this.linearScaleX = d3.scale.linear().domain([0,this.MAX_POLLS]).range([this.leftPadd,this.w - this.rightPadd]);
}
ArgenmapLiveGraph.prototype.buildAxis = function()
{
	this.axisContainer.selectAll('g').remove();
	this.axisContainer.selectAll('path').remove();

	this.yAxis = d3.svg.axis()
		.scale(this.linearScaleY)
		.orient("left")
		.ticks(6)
		.tickSize(this.w - this.leftPadd);


	this.axisContainer.call(this.yAxis);

	this.axisContainer.selectAll('path')
		.style('fill', 'none')
		.style('stroke', '#EEE')
		.style('shape-rendering', 'crispEdges')
		.style('stroke-opacity', '0.5');
	this.axisContainer.selectAll('line')
		.style('fill', 'none')
		.style('stroke', '#EEE')
		.style('shape-rendering', 'crispEdges')
		.style('stroke-opacity', '0.5');
	this.axisContainer.selectAll('text')
		.style('font-family','sans-serif')
	    .style('font-size', '11px')
	    .style('fill','white');
}
ArgenmapLiveGraph.prototype.updateDataHandler = function(datos)
{
	// console.log(datos);
	var jsonData = $.parseJSON(datos.data);
	// console.log(jsonData);
	this.lapCounter = ++this.lapCounter % this.MAX_POLLS;
	this.pollData.push(jsonData);
	if(this.pollData.length > this.MAX_POLLS) this.pollData.shift();
	if(jsonData.requestsNuevos > this.MAX_VALUE_Y) {
		this.MAX_VALUE_Y = jsonData.requestsNuevos;
		this.buildScales();
		this.buildAxis();
	}else{
		//cada MAX_POLLS revisa el valor maximo, si es menor q 30
		//reset de scalas y axis
		if(this.lapCounter === 0) {
			if(d3.max(this.pollData,function(d){return d.requestsNuevos}) < 10) {
				this.MAX_VALUE_Y = 10;
				this.buildScales();
				this.buildAxis();
			}
		}
	}
	this.updateScore(jsonData.requestsNuevos,this.count(jsonData.requestsIndexados.porReferer));
	this.updateGraph();
	$(this.selector).trigger('polldata', jsonData);
}
ArgenmapLiveGraph.prototype.updateScore = function(tiles,clientes)
{
	var a = this.f2d(tiles) || '00';
	var b = this.f4d(clientes) || '0000';
	var labelR = this.labelRequestsNuevos;
	var labelC = this.labelClientes;
	var _this = this;
	var score = {
		tiles:parseInt(labelR.text()),
		clientes:parseInt(labelC.text())
	};
	if(parseInt(a) > 0 || score.tiles != a) {
		var updateValue = function(){
			var t = parseInt(score.tiles);
			var c = parseInt(score.clientes);
			labelR.text(_this.f2d(t));
			labelC.text(_this.f4d(c));
		}
		TweenMax.killTweensOf(this.labelRequestsNuevos,true);
		TweenMax.set(this.labelRequestsNuevos,{opacity:0.6});
		TweenMax.from([this.labelClientes,this.labelRequestsNuevos],this.POLL_INTERVAL * 0.8,{opacity:1,ease:Linear.easeNone});
		TweenMax.to(score,this.POLL_INTERVAL * 0.7,{clientes:parseInt(b),tiles:parseInt(a),onUpdate:updateValue});
	}
	this.labelRequestsNuevos.text(a);
}
ArgenmapLiveGraph.prototype.updateGraph = function()
{
	this.lineContainer.select('path').remove();
	this.lineContainer.append("path")
		.attr("d", this.lineFunction(this.pollData))
		.attr("stroke", this.lineColor)
		.attr("stroke-width", 1.5)
		.attr("fill", "none");
}

/* globalmaptiles.py pasado a JS*/
function GlobalMapTiles()
{
	this.tileSize = 256;
	this.initialResolution = 2 * Math.PI * 6378137 / this.tileSize;
	this.originShift = 2 * Math.PI * 6378137 / 2.0;
}
GlobalMapTiles.prototype.LatLonToMeters = function(lat, lon)
{
	//"Converts given lat/lon in WGS84 Datum to XY in Spherical Mercator EPSG:900913"
	var mx = lon * this.originShift / 180.0;
	var my = Math.log( Math.tan((90 + lat) * Math.PI / 360.0 )) / (Math.PI / 180.0);
	my = my * this.originShift / 180.0;
	return {x:mx, y:my};
	
}
GlobalMapTiles.prototype.MetersToLatLon = function(mx,my)
{
	//"Converts XY point from Spherical Mercator EPSG:900913 to lat/lon in WGS84 Datum"
	var lon = (mx / this.originShift) * 180.0;
	var lat = (my / this.originShift) * 180.0;
	lat = 180 / Math.PI * (2 * Math.atan( Math.exp( lat * Math.PI / 180.0)) - Math.PI / 2.0);
	return {lat:lat, lon:lon}
	
}
GlobalMapTiles.prototype.PixelsToMeters = function(px, py, zoom)
{
	//"Converts pixel coordinates in given zoom level of pyramid to EPSG:900913"

	res = this.Resolution( zoom );
	mx = px * res - this.originShift;
	my = py * res - this.originShift;

	return {x:mx, y:my}
}
GlobalMapTiles.prototype.MetersToPixels = function(mx, my, zoom)
{
	//"Converts EPSG:900913 to pyramid pixel coordinates in given zoom level"

	var res = this.Resolution( zoom );
	var px = (mx + this.originShift) / res;
	var py = (my + this.originShift) / res;
	return {x:px, y:py}
}
GlobalMapTiles.prototype.PixelsToTile = function(px, py)
{
	//"Returns a tile covering region in given pixel coordinates"

	var tx = parseInt( Math.ceil( px / this.tileSize) - 1 );
	var ty = parseInt( Math.ceil( py / this.tileSize) - 1 );
	return {x:tx, y:ty}
}

GlobalMapTiles.prototype.PixelsToRaster = function(px, py, zoom)
{
	//"Move the origin of pixel coordinates to top-left corner"

	var mapSize = this.tileSize << zoom;
	return {x:px, y:mapSize - py}
}
GlobalMapTiles.prototype.MetersToTile = function(mx, my, zoom)
{
	//"Returns tile for given mercator coordinates"

	var t = this.MetersToPixels( mx, my, zoom);
	return this.PixelsToTile( t.x, t.y);
}
GlobalMapTiles.prototype.TileBounds = function(tx, ty, zoom)
{
	//"Returns bounds of the given tile in EPSG:900913 coordinates"
	tx = parseInt(tx);
	ty = parseInt(ty);
	var min = this.PixelsToMeters( tx*this.tileSize, ty*this.tileSize, zoom );
	var max = this.PixelsToMeters( (tx+1)*this.tileSize, (ty+1)*this.tileSize, zoom );
	return [ min.x, min.y, max.x, max.y ]
}
GlobalMapTiles.prototype.TileLatLonBounds = function(tx, ty, zoom )
{
	//"Returns bounds of the given tile in latutude/longitude using WGS84 datum"

	var bounds = this.TileBounds( tx, ty, zoom);
	var min = this.MetersToLatLon(bounds[0], bounds[1]);
	var max = this.MetersToLatLon(bounds[2], bounds[3]);

	return [ min.lon, min.lat, max.lon, max.lat ];
}
GlobalMapTiles.prototype.Resolution = function( zoom )
{
	//"Resolution (meters/pixel) for given zoom level (measured at Equator)"
	return this.initialResolution / (1 << zoom);
}
/* sin pasar, overload
	def ZoomForPixelSize( pixelSize )
		"Maximal scaledown zoom of the pyramid closest to the pixelSize."

		for i in range(30):
			if pixelSize > this.Resolution(i):
				return i-1 if i!=0 else 0 # We don't want to scale up

	def GoogleTile(this, tx, ty, zoom):
		"Converts TMS tile coordinates to Google Tile coordinates"

		# coordinate origin is moved from bottom-left to top-left corner of the extent
		return tx, (2**zoom - 1) - ty

	def QuadTree(this, tx, ty, zoom ):
		"Converts TMS tile coordinates to Microsoft QuadTree"

		quadKey = ""
		ty = (2**zoom - 1) - ty
		for i in range(zoom, 0, -1):
			digit = 0
			mask = 1 << (i-1)
			if (tx & mask) != 0:
				digit += 1
			if (ty & mask) != 0:
				digit += 2
			quadKey += str(digit)

		return quadKey
*/