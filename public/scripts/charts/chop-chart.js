let dim = {
    width: 1110, height: 500,
    margin: { top: 20, right: 70, bottom: 30, left: 20 },
    ohlc: { height: 500 },
    indicator: { height: 65, padding: 5 }
};
dim.plot = {
    width: dim.width - dim.margin.left - dim.margin.right,
    height: dim.height - dim.margin.top - dim.margin.bottom
};

let parseDate = d3.timeParse("%d-%b-%y");

let zoom = d3.zoom()
        .on("zoom", zoomed);

let x = techan.scale.financetime()
        .range([0, dim.plot.width]);

let y = d3.scaleLinear()
        .range([dim.plot.height, 0]);

// let yPercent = y.copy();   // Same as y at this stage, will get a different domain later

let yInit, zoomableInit;

let yVolume = d3.scaleLinear()
        .range([y(0), y(0.2)]);

let candlestick = techan.plot.candlestick()
        .xScale(x)
        .yScale(y);

let tradearrow = techan.plot.tradearrow()
        .xScale(x)
        .yScale(y)
        .y(function(d) {
            // Display the buy and sell arrows a bit above and below the price, so the price is still visible
            if(d.type === 'buy') return y(d.low)+5;
            if(d.type === 'sell') return y(d.high)-5;
            else return y(d.price);
        });

let ema0 = techan.plot.ema()
        .xScale(x)
        .yScale(y);

let ema1 = techan.plot.ema()
        .xScale(x)
        .yScale(y);

let ema2 = techan.plot.ema()
        .xScale(x)
        .yScale(y);

let volume = techan.plot.volume()
        .accessor(candlestick.accessor())   // Set the accessor to a ohlc accessor so we get highlighted bars
        .xScale(x)
        .yScale(yVolume);

let xAxis = d3.axisBottom(x);

let timeAnnotation = techan.plot.axisannotation()
        .axis(xAxis)
        .orient('bottom')
        .format(d3.timeFormat('%Y-%m-%d'))
        .width(65)
        .translate([0, dim.plot.height]);

let yAxis = d3.axisRight(y);

let ohlcAnnotation = techan.plot.axisannotation()
        .axis(yAxis)
        .orient('right')
        .format(d3.format(',.2f'))
        .translate([x(1), 0]);

let closeAnnotation = techan.plot.axisannotation()
        .axis(yAxis)
        .orient('right')
        .accessor(candlestick.accessor())
        .format(d3.format(',.2f'))
        .translate([x(1), 0]);
// let closeAnnotation = techan.plot.axisannotation()
//         .axis(yAxis)
//         .orient('right')
//         .accessor(candlestick.accessor())
//         .format(d3.format(',.2f'))
//         .translate([x(1), 0]);

// let percentAxis = d3.axisLeft(yPercent)
//         .tickFormat(d3.format('+.1%'));
//
// let percentAnnotation = techan.plot.axisannotation()
//         .axis(percentAxis)
//         .orient('left');

let volumeAxis = d3.axisRight(yVolume)
        .ticks(3)
        .tickFormat(d3.format(",.3s"));

let volumeAnnotation = techan.plot.axisannotation()
        .axis(volumeAxis)
        .orient("right")
        .width(35);

let ohlcCrosshair = techan.plot.crosshair()
        .xScale(timeAnnotation.axis().scale())
        .yScale(ohlcAnnotation.axis().scale())
        .xAnnotation(timeAnnotation)
        .yAnnotation([ohlcAnnotation, volumeAnnotation])
        .verticalWireRange([0, dim.plot.height]);

let svg = d3.select("#chart-advanced").append("svg")
        .attr("width", dim.width)
        .attr("height", dim.height);

let defs = svg.append("defs");

defs.append("clipPath")
        .attr("id", "ohlcClip")
    .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", dim.plot.width)
        .attr("height", dim.ohlc.height);

// defs.selectAll("indicatorClip").data([0, 1])
//     .enter()
//         .append("clipPath")
//         .attr("id", function(d, i) { return "indicatorClip-" + i; })
//     .append("rect")
//         .attr("x", 0)
//         .attr("y", function(d, i) { return indicatorTop(i); })
//         .attr("width", dim.plot.width)
//         .attr("height", dim.indicator.height);

svg = svg.append("g")
        .attr("transform", "translate(" + dim.margin.left + "," + dim.margin.top + ")");

svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + dim.plot.height + ")");

let ohlcSelection = svg.append("g")
        .attr("class", "ohlc")
        .attr("transform", "translate(0,0)");

ohlcSelection.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(" + x(1) + ",0)")
    .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -12)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Price ($)");

ohlcSelection.append("g")
        .attr("class", "close annotation up");

ohlcSelection.append("g")
        .attr("class", "volume")
        .attr("clip-path", "url(#ohlcClip)");

ohlcSelection.append("g")
        .attr("class", "candlestick")
        .attr("clip-path", "url(#ohlcClip)");

ohlcSelection.append("g")
        .attr("class", "indicator ema ma-0")
        .attr("clip-path", "url(#ohlcClip)");

ohlcSelection.append("g")
        .attr("class", "indicator ema ma-1")
        .attr("clip-path", "url(#ohlcClip)");

ohlcSelection.append("g")
        .attr("class", "indicator ema ma-2")
        .attr("clip-path", "url(#ohlcClip)");

// ohlcSelection.append("g")
//         .attr("class", "percent axis");

ohlcSelection.append("g")
        .attr("class", "volume axis");

// Add trendlines and other interactions last to be above zoom pane
svg.append('g')
        .attr("class", "crosshair ohlc");

svg.append("g")
        .attr("class", "tradearrow")
        .attr("clip-path", "url(#ohlcClip)");

svg.append("g")
        .attr("class", "trendlines analysis")
        .attr("clip-path", "url(#ohlcClip)");

svg.append("g")
     .attr("class", "grid")
     .attr("transform", "translate(0," + dim.plot.height + ")")
     .call(make_x_gridlines()
     .tickSize(-dim.plot.height)
     .tickFormat(""));

svg.append("g")
     .attr("class", "grid")
     .call(make_y_gridlines()
     .tickSize(-dim.plot.width)
     .tickFormat(""));

let rescaledX, rescaledY;

function initChart(data, params){
  let accessor = candlestick.accessor();  // Don't show where indicators don't have data

  data = data.sort(function(a, b) { return d3.ascending(accessor.d(a), accessor.d(b)); });

  x.domain(techan.scale.plot.time(data).domain());
  y.domain(techan.scale.plot.ohlc(data).domain());
  // yPercent.domain(techan.scale.plot.percent(y).domain());
  yVolume.domain(techan.scale.plot.volume(data).domain());

  // Stash for zooming
  zoomableInit = x.zoomable().copy();
  yInit = y.copy();

  if (rescaledX || rescaledY) {
    x.zoomable().domain(rescaledX.domain());
    y.domain(rescaledY.domain());
  }

  svg.select('g.x.axis').call(xAxis);
  svg.select('g.y.axis').call(yAxis);

  svg.select("g.candlestick").datum(data).call(candlestick);
  // svg.select("g.close.annotation").datum([data[data.length-1]]).call(closeAnnotation);
  svg.select("g.volume").datum(data).call(volume);
  svg.select("g.ema.ma-0").datum(techan.indicator.ema().period(5)(data)).call(ema0);
  svg.select("g.ema.ma-1").datum(techan.indicator.ema().period(10)(data)).call(ema1);
  svg.select("g.ema.ma-2").datum(techan.indicator.ema().period(params.ema.period)(data)).call(ema2);
  svg.select("g.tradearrow").datum(params.tradesArray).call(tradearrow);

  svg.select("g.crosshair.ohlc").call(ohlcCrosshair).call(zoom);

  draw(params);
}

function zoomed() {
    rescaledX = d3.event.transform.rescaleX(zoomableInit);
    rescaledY = d3.event.transform.rescaleY(yInit);

    x.zoomable().domain(d3.event.transform.rescaleX(zoomableInit).domain());
    y.domain(d3.event.transform.rescaleY(yInit).domain());

    draw();
}

function draw() {
    svg.select("g.x.axis").call(xAxis);
    svg.select("g.ohlc .axis").call(yAxis);
    svg.select("g.volume.axis").call(volumeAxis);
    // svg.select("g.percent.axis").call(percentAxis);

    // We know the data does not change, a simple refresh that does not perform data joins will suffice.
    svg.select("g.candlestick").call(candlestick.refresh);
    svg.select("g.volume").call(volume.refresh);
    svg.select('g.close.annotation').call(closeAnnotation.refresh)
    svg.select("g .ema.ma-0").call(ema0.refresh);
    svg.select("g .ema.ma-1").call(ema1.refresh);
    svg.select("g .ema.ma-2").call(ema2.refresh);
    svg.select("g.crosshair.ohlc").call(ohlcCrosshair.refresh);
    svg.select("g.tradearrow").call(tradearrow.refresh);
}

function make_x_gridlines() {
  return d3.axisBottom(x).ticks(9);
};

function make_y_gridlines() {
  return d3.axisLeft(y).ticks(9);
};
