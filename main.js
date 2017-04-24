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
			var neighbourOrder = [];
			for(var x = 0; x < this.app.width; x++){
				this.particles[x] = [];
				neighbourOrder[x] = [];
				for(var y = 0; y < this.app.height; y++){					
					this.particles[x][y] = PARTICLES.create('empty');
					neighbourOrder[x][y] = [
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
			}

			this.imageData = this.app.layer.createImageData(this.app.width, this.app.height);
			
			for(var x = 0; x < this.app.width; x++){
				for(var y = 0; y < this.app.height; y++){					
					if(this.heightSq(x, y) <= 400) {
						if(Math.random() < 0.9) {
							this.setParticle(x, y, PARTICLES.create('core'));
						}
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

			var touchedEntrySize = 2+PARTICLES.byteSize;
			var onWorkerMessage = (function onWorkerMessage(e){				
				if(e.data !== 'error'){
					var touched = new Uint8Array(e.data.touched);
					for (var offset = 0; offset < touched.length; offset += touchedEntrySize) {						
						var x = touched[offset];
						var y = touched[offset+1]
						var particle = PARTICLES.fromBytes(touched, offset+2);
						if(particle){
							this.setParticle(x, y, particle);
						}	
					
					}
					var arraysToSend = [];
					while(arraysToSend.length < this.workers.length-2){
						arraysToSend.push(touched.slice().buffer);
					}
					arraysToSend.push(touched.buffer);
					this.workers.forEach(function(worker){
						if(worker.coordinates === e.data.coordinates){
							return;
						}
						var buffer = arraysToSend.pop();
						worker.postMessage({
							type: 'update',
							data: {
								touched: buffer
							}
						},[buffer]);
					}.bind(this));
				}
				this.waitingOnResponse--;
			}).bind(this);

			this.workers = [];
			var numWorkersPerDimension = 3;
			var borderWidth = 16;
			var globalSeed = Math.random();
			for(var x = 0; x < numWorkersPerDimension; x++){
				for(var y = 0; y < numWorkersPerDimension; y++){
					var border = {top:0, left:0, right:0, bottom:0}
					if(x > 0){
						border.left = borderWidth;
					}
					if(x < numWorkersPerDimension-1){
						border.right = borderWidth;
					}
					if(y > 0){
						border.top = borderWidth;
					}
					if(y < numWorkersPerDimension-1){
						border.bottom = borderWidth;
					}

					var width = Math.floor(this.app.width/numWorkersPerDimension);
					var offsetX = width*x;
					if(x === numWorkersPerDimension-1){
						width = this.app.width - offsetX;
					}				
					width += border.left + border.right;
					offsetX -= border.left;

					var height = Math.floor(this.app.width/numWorkersPerDimension);
					var offsetY = height*y;
					if(y === numWorkersPerDimension-1){
						height = this.app.height - offsetY;
					}
					height += border.top + border.bottom;
					offsetY -= border.top

					var particles = this.particles
						.slice(offsetX, offsetX + width)
						.map(function(col){
							return col.slice(offsetY, offsetY + height).map(function(particle){
								return particle.name;								
							});
						});
					var localNeighbourOrder = neighbourOrder
						.slice(offsetX, offsetX + width)
						.map(function(col){
							return col.slice(offsetY, offsetY + height);
						});

					var worker = new Worker('worker.js');
					worker.coordinates = x+':'+y;
					worker.postMessage({
						type: 'init',
						data: {						
							size: {x: width, y:height},
							center: {x: this.app.center.x, y:this.app.center.y},
							border: border,
							offset: {x:offsetX, y:offsetY},
							particles: particles,
							coordinates: worker.coordinates,
							globalSeed: globalSeed,
							neighbourOrder: localNeighbourOrder
						}
					});
					worker.onmessage = onWorkerMessage;
					this.workers.push(worker);
				}
			}

			this.rngResetCounter = 100;			
		},
		step: function(dt) {
			var swapped = [];

			if(this.waitingOnResponse > 0){
				this.doDraw = false;
				return;
			}
			
			var globalSeed = this.rngResetCounter <= 0 ? Math.random() : false;
			if(this.rngResetCounter <= 0){
				this.rngResetCounter = 100;
			} else {
				this.rngResetCounter--;
			}
			this.workers.forEach(function(worker){
				worker.postMessage({
					type: 'step',
					data: globalSeed
				});
			}.bind(this));
			this.waitingOnResponse = this.workers.length;
			this.doDraw = true;	
		},
		render: function(dt) {
			if(this.doDraw){
				this.app.layer.putImageData(this.imageData, 0, 0);
			}
		},
		mousemove: function(data) {
		},
		mousedown: function(data) {
			var counts = {};
			for(var x = 0; x < this.app.width; x++){
				for(var y = 0; y < this.app.height; y++){
					var name = this.particles[x][y].name;
					if(!counts[name]){
						counts[name] = 1;						
					}else{
						counts[name]++;
					}
				}
			}
			console.log(counts, data.x, data.y);
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
			this.setImageData(x, y, particle.color);
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