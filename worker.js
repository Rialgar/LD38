importScripts('particles.js');
importScripts('alea.min.js');

var initialized = false;

var settings = {};
var shared = {}

var touchedEntrySize = 2+PARTICLES.byteSize;

function init(data){
	settings.size = data.size;
	settings.offset = data.offset;
	settings.border = data.border;
	settings.center = data.center;
	settings.coordinates = data.coordinates;
	settings.globalSeed = data.globalSeed;
	settings.neighbourOrder = data.neighbourOrder;

	shared.particles = data.particles.map(function(column){
		return column.map(function(name){
			return PARTICLES.create(name);
		});
	});

	initialized = true;
}

var rngs = {};
function random(gx, gy){
	var id = gx+':'+gy;
	if(!rngs[id]){
		rngs[id] = new alea(id+':'+settings.globalSeed);
	}
	if(!rngs[id].testCount){
		rngs[id].testCount = 1;
	} else {
		rngs[id].testCount++;
	}
	return rngs[id]();
}

function countNeighbours(x, y){
	var result = {};
	for (var dx =-1; dx < 2; dx++) {
		for (var dy =-1; dy < 2; dy++) {
			var particle = shared.particles[x+dx] && shared.particles[x+dx][y+dy];
			if(particle){
				var name = particle.name;
				if(!result[name]) {
					result[name] = 1
				} else {
					result[name]++;
				}
			}
		}
	}
	return result;
}

function setTouched(x, y){
	if(x < settings.border.left || x >= settings.size.x - settings.border.right){
		return;
	}
	if(y < settings.border.top || y >= settings.size.y - settings.border.bottom){
		return;
	}

	if(!shared.touched[x]){
		shared.touched[x] = {};
	}
	if(!shared.touched[x][y]){
		shared.touched[x][y] = true;
		shared.touchedCount++;
	}
}

function getParticle(x, y){
	return shared.particles[x] && shared.particles[x][y];
}

function setParticle(x, y, particle){
	if(shared.particles[x] && shared.particles[x][y]){
		shared.particles[x][y] = particle;	
	}
}

function distanceSq(x1, y1, x2, y2){
	var dx = x1 - x2;
	var dy = y1 - y2;
	return dx*dx + dy*dy;
}

function heightSq(gx, gy){
	return distanceSq(gx, gy, settings.center.x, settings.center.y);
}

function getNeighbourOrder(x, y){
	return settings.neighbourOrder[x][y];
}

function shouldSwap (x1, y1, x2, y2){
	var particle1 = getParticle(x1, y1);
	var particle2 = getParticle(x2, y2);
	if(!particle1 || !particle2){
		return false;
	}
	if(particle1.wasSwapped || particle2.wasSwapped){
		return false;
	}
	if(particle1.name === particle2.name){
		return false;
	}
	var gx1 = x1+settings.offset.x;
	var gy1 = y1+settings.offset.y;
	if(particle1.weight > particle2.weight && (particle2.empty || particle2.liquid || particle1.liquid) && random(gx1, gy1) < 0.8){
		var h1 = heightSq(gx1, gy1);
		var h2 = heightSq(x2+settings.offset.x, y2+settings.offset.y);
		if(h1 > h2){
			return true;
		} else if(particle1.liquid) {
			return Math.sqrt(h2) - Math.sqrt(h1) < Math.pow(random(gx1, gy1), 2);
		}
	}

	return false;
}

function swapParticles(x1, y1, x2, y2){
	var particle1 = getParticle(x1, y1);
	var particle2 = getParticle(x2, y2);
	setParticle(x1, y1, particle2);
	setParticle(x2, y2, particle1);
	particle1.wasSwapped = true;
	particle2.wasSwapped = true;
	particle1.notMoved = 0;
	particle2.notMoved = 0;
}

var handlers = {
	step: function(globalSeed){
		if(globalSeed){
			rngs = {};
			settings.globalSeed = globalSeed;
		}

		var changed = [];
		shared.touched = {};
		shared.touchedCount = 0;

		for(var x = 0; x < settings.size.x; x++){
			for(var y = 0; y < settings.size.y; y++){
				var particle = getParticle(x, y);
				if(particle && particle.transitions && (particle.active || particle.transitionPossible)){
					setTouched(x, y);
					particle.transitionPossible = false;
					var neighbours;
					if(particle.hasTransitionRequirements){
						neighbours = countNeighbours(x, y);
					} else {
						neighbours = {};
					}
					transitionLoop: for (var transitionIndex = 0; transitionIndex < particle.transitions.length; transitionIndex++) {
						var t = particle.transitions[transitionIndex];
						for(var reqParticle in t.requirement){
							if(!(neighbours[reqParticle] >= t.requirement[reqParticle])){
								continue transitionLoop;
							}								
						}
						particle.transitionPossible = true;
						var gx = x + settings.offset.x;
						var gy = y + settings.offset.y;
						if(random(gx, gy) < t.probability){
							setParticle(x, y, PARTICLES.create(t.changeTo));
							changed.push({x: x, y: y});
							break transitionLoop;
						}
					}
				}
			}
		}

		for(var neighbourIndex = 0; neighbourIndex < 6; neighbourIndex++){
			var coords;
			for(var x = 0; x < settings.size.x; x++){
				for(var y = 0; y < settings.size.y; y++){
					var particle = getParticle(x, y);
					if(!particle || !particle.active || particle.wasSwapped){
						continue;
					}
					setTouched(x, y);
					var neighbours = getNeighbourOrder(x, y);
					if(neighbourIndex < neighbours.length){
						n = neighbours[neighbourIndex];
						var x2 = x+n.x;
						var y2 = y+n.y;
						if(shouldSwap(x, y, x2, y2)){
							swapParticles(x, y, x2, y2);
							changed.push({x:x, y:y});
							changed.push({x:x2, y:y2});
							continue;
						}
					}
					if(neighbourIndex === 5){
						if(particle.notMoved >= (particle.liquid ? 2 : 1)){
							particle.active = false;
						} else {
							particle.notMoved++;
						}
					}
				}
			}
		}

		for (var i = 0; i < changed.length; i++) {
			var coords = changed[i];
			for(var x = -1; x < 2; x++){
				for(var y = -1; y < 2; y++){					
					var particle = getParticle(coords.x+x, coords.y+y);
					if(particle){
						particle.active = true;
						particle.wasSwapped = false;
						setTouched(coords.x+x, coords.y+y);
					}
				}
			}
		}

		var out = new Uint8Array(shared.touchedCount * touchedEntrySize);
		var offset = 0;
		for(var x in shared.touched){
			for(var y in shared.touched[x]){
				x = parseInt(x);
				y = parseInt(y);
				out[offset] = x + settings.offset.x;
				out[offset+1] = y + settings.offset.y;

				var particle = getParticle(x, y);
				PARTICLES.toBytes(particle, out, offset+2);

				offset += touchedEntrySize;
			}
		}

		self.postMessage({
			touched: out.buffer,
			coordinates: settings.coordinates
		}, [out.buffer]);
	},
	update: function(data){
		var touched = new Uint8Array(data.touched);
		for (var offset = 0; offset < touched.length; offset += touchedEntrySize) {						
			var gx = touched[offset];
			var gy = touched[offset+1]

			var x = gx - settings.offset.x;
			var y = gy - settings.offset.y;

			if(getParticle(x, y)){
				var particle = PARTICLES.fromBytes(touched, offset+2);
				if(particle){				
					setParticle(x, y, particle);
				}
			}
		}		
	}
}

self.onmessage = function(e){
	if(e.data.type === 'init'){
		init(e.data.data);
	} else if(!initialized) {
		throw new Error('received event before initialization: ' + JSON.strinigfy(e.data));
	} else {
		var handler = handlers[e.data.type];
		if(handler){
			try {
				handler(e.data.data);
			} catch (e) {
				self.postMessage('error');
				throw e;
			}
		}
	}
}