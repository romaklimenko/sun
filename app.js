/* global Modernizr: true */
/* global Raphael: true */
/* global moment: true */

var latitude    = 55.6712673;
var longitude  = 12.5608388;
var dates;
var paper;

function initializeLocation() {

  function set_location(position) {
    latitude = position.coords.latitude;
    longitude = position.coords.longitude;
  }

  if (Modernizr.geolocation) {
    navigator.geolocation.getCurrentPosition(set_location);
  } else {
    // TODO:
  }
}

function initializeDates() {
  var year = new Date().getFullYear();
  var isLeap = new Date(year, 1, 29).getMonth() === 1;

  var count = isLeap ? 366 : 365;

  dates = [];

  for (var i = 0; i < count; i++) {
    dates.push(moment().startOf("year").add(i, "d"));
  }
}

function renderInformers() {
  var yesterday = moment().add(-1, "d");
  var yesterdaySunrise = yesterday._d.sunrise(latitude, longitude);
  var yesterdaySunset = yesterday._d.sunset(latitude, longitude);
  var yesterdayDuration = moment.duration(yesterdaySunset - yesterdaySunrise).asMinutes();

  var today = moment();
  var todaySunrise = today._d.sunrise(latitude, longitude);
  var todaySunset = today._d.sunset(latitude, longitude);
  var todayDuration = moment.duration(todaySunset - todaySunrise).asMinutes();

  var tomorrow = moment().add(1, "d");
  var tomorrowSunrise = tomorrow._d.sunrise(latitude, longitude);
  var tomorrowSunset = tomorrow._d.sunset(latitude, longitude);
  var tomorrowDuration = moment.duration(tomorrowSunset - tomorrowSunrise).asMinutes();

  $("#yesterday").html(
    "Yesterday was " +
    Math.abs(Math.round(yesterdayDuration - todayDuration)) + " minutes " +
    ((yesterdayDuration > todayDuration) ? " longer &uarr;" : "shorter &darr;" ));

  $("#today").html(
    "Today, sunrise at " +
    moment(todaySunrise).format("HH:mm") +
    " and sunset at " +
    moment(todaySunset).format("HH:mm"));

  $("#tomorrow").html(
    "Tomorrow will be " +
    Math.abs(Math.round(todayDuration - tomorrowDuration)) + " minutes " +
    ((tomorrowDuration > todayDuration) ? " longer &uarr;" : "shorter &darr;" ));
}

function renderPaper() {
  $("#paper").height($(window).height() - $("header").height() - 70);

  $("#paper").html("");

  paper = new Raphael("paper", $("#paper").width(), $("#paper").height());
}

function renderSunriseAndSunset() {

  function getX(i) {
    return i * pxPerDay;
  }

  function getY(date) {
    return (date.getHours() * 60 + date.getMinutes()) * pxPerMinute;
  }

  var height = $("#paper").height();
  var width = $("#paper").width();

  var pxPerDay = width / (dates.length - 1);
  var pxPerMinute = height / (24 * 60);

  var pathArray = [];

  for (var i = 0; i < dates.length; i++) {
    if (i === 0) {
      pathArray = pathArray.concat(
        ["M", getX(i), getY(dates[i]._d.sunrise(latitude, longitude))]);
    }
    else {
      pathArray = pathArray.concat(
        ["L", getX(i), getY(dates[i]._d.sunrise(latitude, longitude))]);
    }
  }

  for (var i = dates.length - 1; i >= 0; i--) {
    pathArray = pathArray.concat(
      ["L", getX(i), getY(dates[i]._d.sunset(latitude, longitude))]);
  }

  pathArray = pathArray.concat(["Z"]);

  var path = paper.path().attr({
    fill: "#fdf6e3",
    path: pathArray,
    stroke: "#657b83"
  });

  /*for (var i = 0; i < dates.length; i++) {
    var sunrise = dates[i]._d.sunrise(latitude, longitude);
    paper.circle(
      getX(i),
      getY(sunrise), 1)
    .attr({fill: "#657b83", stroke: "#657b83"});

    var sunset = dates[i]._d.sunset(latitude, longitude);
    paper.circle(
      getX(i),
      getY(sunset), 1)
    .attr({fill: "#657b83", stroke: "#657b83"});
  }*/

  // you are here
  var date = new Date();
  paper.circle(
    (moment(date).dayOfYear() - 1) * pxPerDay,
    getY(date), 5)
  .attr({fill: "#FFFF00", stroke: "#cb4b16"});
}

initializeLocation();

function reset() {
  initializeDates();
  renderInformers();
  renderPaper();
  renderSunriseAndSunset();
}

reset();

$(window).resize(function() {
  reset();
});

setInterval( function() { reset(); }, 60000);
