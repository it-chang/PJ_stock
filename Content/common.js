Vue.prototype.LocationOrigin = window.location.origin

Vue.prototype.UrlContent = function (x){ 
  
  
	return this.LocationOrigin+x
}
