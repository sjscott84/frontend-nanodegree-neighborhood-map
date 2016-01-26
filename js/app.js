'use strict';
var map;
var startPoint = {lat:37.773972, lng: -122.431297};
var searchBox;
var places;
var listView;
var view;
var markers = [];

function initMap(){
	map = new google.maps.Map(document.getElementById('map'),{
		center: startPoint,
		zoom: 12,
		mapTypeId: google.maps.MapTypeId.ROADMAP
	});

	addSearch();

	map.controls[google.maps.ControlPosition.LEFT_TOP].push(
		document.getElementById('legend'));
}

function addSearch (){
	// Create the search box and link it to the UI element.
	var input = document.getElementById('pac-input');
	searchBox = new google.maps.places.SearchBox(input);
	var bounds = new google.maps.LatLngBounds();
	map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

	//Bias the SearchBox results towards current map's viewport.
	map.addListener('bounds_changed', function() {
		searchBox.setBounds(map.getBounds());
	});

	// Listen for the event fired when the user selects a prediction and retrieve
	// more details for that place.
	searchBox.addListener('places_changed', function() {
		places = searchBox.getPlaces();
			if (places.length === 0) {
				return;
			}
		places.forEach(function(place) {
			var name = place.name;
			var position = place.geometry.location;
			var icon = {
				url: 'http://maps.gstatic.com/mapfiles/markers2/markerA.png',
				origin: new google.maps.Point(0, 0),
				anchor: new google.maps.Point(17, 34),
			};

			view.addPlace(name, position, icon);


			if (place.geometry.viewport) {
			// Only geocodes have viewport.
				bounds.union(place.geometry.viewport);
			} else {
				bounds.extend(place.geometry.location);
			}

		map.fitBounds(bounds);
	});
});
	findThings();
}

function findThings (){

	var service = new google.maps.places.PlacesService(map);
	service.nearbySearch({
		location: startPoint,
		radius: '5000',
		type: ['museum']
		}, callback);

	function callback(results, status){
		if (status === google.maps.places.PlacesServiceStatus.OK) {
			for (var i = 0; i < results.length; i++) {
					var place = results[i];
					var name = place.name;
					var position = place.geometry.location;
					var icon = {
						url: 'http://maps.gstatic.com/mapfiles/markers2/markerA.png',
						origin: new google.maps.Point(0, 0),
						anchor: new google.maps.Point(17, 34),
					};

					view.addPlace(name, position, icon);
					//createMarker(results[i]);)
			}
		}
	}
}

var outdoors = ['park', 'zoo'];
var culture = ['art_gallery', 'library', 'museum'];
var amusement = ['amusement_park', 'bowling_alley', 'museum', 'stadium'];
var animals = ['aquarium', 'zoo'];

var Place = function(name, position, icon){
	this.map = map;
	this.name = ko.observable(name);
	this.position = position;
	this.icon = icon;
	markers.push(new google.maps.Marker({
			map: map,
			icon: icon,
			title: name,
			position: this.position
		}));
};

var ViewModel = function(){
	var self = this;

	self.listView = ko.observableArray([]);

	self.addPlace = function (name, position, icon){
		self.listView.push(new Place(name, position, icon));
	};

	self.seePlaces = function (){
		var forSearch = [];
		$('input[name="whatToDo"]:checked').each(function(){
			var input = this.value;
			forSearch.push(input);
		});
			console.log(forSearch);
	};



};

view = new ViewModel();

ko.applyBindings(view);


