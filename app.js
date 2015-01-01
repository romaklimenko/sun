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

  $("#today").html(moment(todaySunrise).format("HH:mm") + "&uarr; • Today • " +
    moment(todaySunset).format("HH:mm") + "&darr;");

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
  var height = $("#paper").height();
  var width = $("#paper").width();

  var pxPerDay = width / dates.length;
  var pxPerMinute = height / (24 * 60);

  for (var i = 0; i < dates.length; i++) {
    var sunrise = dates[i]._d.sunrise(latitude, longitude);
    paper.circle(
      i * pxPerDay,
      (sunrise.getHours() * 60 + sunrise.getMinutes()) * pxPerMinute, 1)
    .attr({fill: "#000000", stroke: "#000000"});

    var sunset = dates[i]._d.sunset(latitude, longitude);
    paper.circle(
      i * pxPerDay,
      (sunset.getHours() * 60 + sunset.getMinutes()) * pxPerMinute, 1)
    .attr({fill: "#000000", stroke: "#000000"});
  }

  // you are here
  var date = new Date();
  paper.circle(
    (moment(date).dayOfYear() - 1) * pxPerDay,
    (date.getHours() * 60 + date.getMinutes()) * pxPerMinute, 5)
  .attr({fill: "#FF0000", stroke: "#FF0000"});
}

function reset() {
  initializeLocation();
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
