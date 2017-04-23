window.addEventListener('load', function(){
	var ENGINE = {};

	function distanceSq(x1, y1, x2, y2){
		var dx = x1-x2;
		var dy = y1-y2;
		return dx*dx + dy*dy;
	}
	ENGINE.mainGame = {
		create: function(){
			this.particles = [];
			this.neighbourOrder = [];
			for(var x = 0; x < this.app.width; x++){
				this.particles[x] = [];
				this.neighbourOrder[x] = [];
				for(var y = 0; y < this.app.height; y++){					
					this.particles[x][y] = PARTICLES.create('empty');
					this.getNeighbourOrder(x,y);
				}
			}

			this.imageData = this.app.layer.createImageData(this.app.width, this.app.height);
			
			for(var x = 0; x < this.app.width; x++){
				for(var y =0; y < this.app.height; y++){					
					if(this.heightSq(x, y) <= 100) {
						this.setParticle(x, y, PARTICLES.create('core'));
					} else if(this.heightSq(x, y) <= 3000) {
						if(Math.random() < 0.8) {
							this.setParticle(x, y, PARTICLES.create('rock'));
						}
					} else if(this.heightSq(x, y) <= 6000) {
						if(Math.random() < 0.9) {
							this.setParticle(x, y, PARTICLES.create('air'));
						}
					} else if(this.heightSq(x, y) <= 6400) {
						if(Math.random() < 0.9) {
							this.setParticle(x, y, PARTICLES.create('vapor'));
						}
					}
				}
			}
		},
		step: function(dt) {
			console.log(dt);
			var swapped = [];
			
			for(var x = 0; x < this.app.width; x++){
				for(var y = 0; y < this.app.height; y++){
					var particle = this.particles[x][y];
					if(particle.transitions && (particle.active || particle.transitionPossible)){
						particle.transitionPossible = false;
						var neighbours;
						if(particle.hasTransitionRequirements){
							neighbours = this.countNeighbours(x, y);
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
							if(Math.random() < t.probability){
								this.setParticle(x, y, PARTICLES.create(t.changeTo));
								swapped.push({x:x, y:y});
								break transitionLoop;
							}
						}
					}
				}
			}

			for(var neighbourIndex = 0; neighbourIndex < 6; neighbourIndex++){
				var coords;
				for(var x = 0; x < this.app.width; x++){
					for(var y = 0; y < this.app.height; y++){
						var particle = this.particles[x][y];
						if(!particle.active || particle.wasSwapped){
							continue;
						}						
						var neighbours = this.getNeighbourOrder(x, y);
						if(neighbourIndex < neighbours.length){
							n = neighbours[neighbourIndex];				
							var x2 = x+n.x;
							var y2 = y+n.y;
							if(this.shouldSwap(x, y, x2, y2)){
								this.swapParticles(x, y, x2, y2);
								swapped.push({x:x, y:y});
								swapped.push({x:x2, y:y2});
							}
						}
						if(neighbourIndex === 5){
							if(particle.notMoved >= (particle.liquid ? 2 : 1)){
								particle.active = false;
							}
							particle.notMoved++;
						}
					}
				}
			}

			for (var i = 0; i < swapped.length; i++) {
				for(var x = -1; x < 2; x++){
					for(var y = -1; y < 2; y++){
						var particle = this.particles[swapped[i].x+x] && this.particles[swapped[i].x+x][swapped[i].y+y]
						if(particle){
							particle.active = true;
							particle.wasSwapped = false;
						}
					}
				}
			}
		},
		render: function(dt) {
			this.app.layer.putImageData(this.imageData, 0, 0);			
		},
		mousemove: function(data) {
			if(this.particles[data.x] && this.particles[data.x][data.y]){
				this.particles[data.x][data.y].active = true;
			}
		},
		mousedown: function(data) {

		},
		mouseup: function(data) {

		},
		setImageData: function(x, y, color){
			var index = this.imageData.width * 4 * y + x * 4;
			if(color){
				var r = parseInt(color.substr(1,2), 16);
				var g = parseInt(color.substr(3,2), 16);
				var b = parseInt(color.substr(5,2), 16);
				
				this.imageData.data[index] = r;
				this.imageData.data[index+1] = g;
				this.imageData.data[index+2] = b;
				this.imageData.data[index+3] = 255;
			} else {
				this.imageData.data[index+3] = 0;
			}
		},
		setParticle: function(x, y, particle){
			this.particles[x][y] = particle;
			particle.active = true;
			this.setImageData(x, y, particle.color);
		},
		swapParticles: function(x1, y1, x2, y2){
			var particle1 = this.particles[x1] && this.particles[x1][y1];
			var particle2 = this.particles[x2] && this.particles[x2][y2];
			this.setParticle(x1, y1, particle2);
			this.setParticle(x2, y2, particle1);
			particle1.wasSwapped = true;
			particle2.wasSwapped = true;
			particle1.notMoved = 0;
			particle2.notMoved = 0;
		},
		heightSq: function(x, y){
			return distanceSq(x, y, this.app.center.x, this.app.center.y);
		},
		distanceToFreeFall: function(x, y, x2, y2){
			x = x-this.app.center.x;			
			y = y-this.app.center.y;
			x2 = x2-this.app.center.x;
			y2 = y2-this.app.center.y;

			return Math.abs(x*y2 - x2*y)/Math.sqrt(x*x + y*y);
		},
		shouldSwap: function(x1, y1, x2, y2){
			var particle1 = this.particles[x1] && this.particles[x1][y1];
			var particle2 = this.particles[x2] && this.particles[x2][y2];
			if(!particle1 || !particle2){
				return false;
			}
			if(particle1.wasSwapped || particle2.wasSwapped){
				return false;
			}
			if(particle1.name === particle2.name){
				return false;
			}
			if(particle1.weight > particle2.weight && (particle2.empty || particle2.liquid || particle1.liquid)){
				var h1 = this.heightSq(x1, y1);
				var h2 = this.heightSq(x2, y2);
				if(h1 > h2){
					return Math.random() < 0.8;
				} else if(particle1.liquid && Math.sqrt(h2) - Math.sqrt(h1) < Math.pow(Math.random(),2)) {
					return true;
				}
			}

			return false;
		},
		countNeighbours: function(x, y){
			var result = {};
			for (var dx =-1; dx < 2; dx++) {
				for (var dy =-1; dy < 2; dy++) {
					var particle = this.particles[x+dx] && this.particles[x+dx][y+dy];
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
		},
		getNeighbourOrder: function(x, y){
			if(!this.neighbourOrder[x][y]){
				this.neighbourOrder[x][y] = [
					{x: -1, y: -1},
					{x: -1, y:  0},
					{x: -1, y:  1},
					{x:  0, y: -1},
					{x:  0, y:  1},
					{x:  1, y: -1},
					{x:  1, y:  0},
					{x:  1, y:  1}
				].filter(function(a){
					return Math.sqrt(this.heightSq(x+a.x, y+a.y)) < Math.sqrt(this.heightSq(x, y)) + 1;
				}.bind(this)).sort(function(a, b){
					var result = this.distanceToFreeFall(x, y, x+a.x, y+a.y) - this.distanceToFreeFall(x, y, x+b.x, y+b.y)
					if(result === 0){
						//de-stabilize sorting algortihm for equal distance, to make sure no patterns emerge
						return Math.random()*2 - 1;
					} else {
						return result;
					}
				}.bind(this))				
			}
			return this.neighbourOrder[x][y];			
		}
	}
	playground({
		smoothing: false,
		width: 221,
		height: 221,
		background: '#000000',
		ready: function(){
			this.setState(ENGINE.mainGame);
		}
	});
});