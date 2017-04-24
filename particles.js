PARTICLES = {
	prototypes: {
		empty : {
			weight: 0,
			empty: true,
		},
		vapor: {
			color: '#FFFFFF',
			weight: 10,
			liquid: true,
			transitions: [
				{
					probability: 0.005,
					changeTo: 'water'
				}
			]
		},
		air: {
			color: '#87CEEB',
			weight: 20,
			liquid: true
		},
		algae: {
			color: '#0c7860',
			weight: 40,
			transitions: [
				{
					probability: 0.01,
					changeTo: 'soil'
				}
			]
		},
		water: {
			color: '#1C6BA0',
			weight: 50,
			liquid: true,
			transitions: [
				{
					requirement: {air: 1},
					probability: 0.01,
					changeTo: 'vapor'
				},
				{
					requirement: {magma: 1},
					probability: 0.1,
					changeTo: 'vapor'
				}
			]
		},
		grass: {
			color: '#a1b841 ',
			weight: 60,
			transitions: [
				{
					probability: 0.01,
					changeTo: 'soil'
				},
				{
					requirement: {magma: 1},
					probability: 0.5,
					changeTo: 'soil'
				}
			]
		},
		soil: {
			color: '#663300 ',
			weight: 80,
			transitions: [
				{
					requirement: {air: 1},
					probability: 0.05,
					changeTo: 'grass'
				},
				{
					requirement: {water: 1},
					probability: 0.01,
					changeTo: 'algae'
				},
				{
					requirement: {magma: 1},
					probability: 0.05,
					changeTo: 'sand'
				}
			]
		},
		sand: {
			color: '#EDC9AF',
			weight: 100,
			transitions: [
				{
					requirement: {water: 1},
					probability: 0.01,
					changeTo: 'algae'
				},
				{
					requirement: {magma: 1},
					probability: 0.1,
					changeTo: 'magma'
				}
			]
		},
		magma: {
			color: '#f86f29 ',
			weight: 150,
			liquid: true,
			transitions: [
				{
					requirement: {water: 1},
					probability: 0.9,
					changeTo: 'rock'
				},
				{
					requirement: {air: 1},
					probability: 0.01,
					changeTo: 'rock'
				}
			]
		},
		rock: {
			color: '#808487',
			weight: 200,
			transitions: [
				{
					requirement: {water: 1},
					probability: 0.1,
					changeTo: 'sand'
				},
				{
					requirement: {core: 1},
					probability: 0.0001,
					changeTo: 'magma'
				}
			]
		},
		core: {
			color: '#CF1020',
			weight: 1000,
			liquid: true
		}
	},
	constructors: {},
	create: function(name){
		var proto = this.prototypes[name];
		if(!proto){
			throw new Error('No such particle: ' + name);
		}
		if(!proto.name){
			proto.name = name;
			if(proto.transitions){
				proto.hasTransitionRequirements = false;
				proto.transitions.forEach(function(t){
					if(t.requirement){
						proto.hasTransitionRequirements = true;
					}
				});
			}
			this.constructors[name] = function(){
				this.notMoved = 0;
				this.wasSwapped = false;
				this.active = true;
				this.transitionPossible = false;
			};
			this.constructors[name].prototype = proto;
		}		
		return new this.constructors[name]();
	},
	ensureTypeArray: function(){
		if(!this.types){
			this.types = [];
			for(var name in this.prototypes){
				this.types.push(name);
			}
		}
	},
	toBytes: function(particle, bytes, offset){
		this.ensureTypeArray();
		bytes[offset] = this.types.indexOf(particle.name);
		bytes[offset+1] = particle.notMoved;
		bytes[offset+2] = particle.wasSwapped ? 1 : 0;
		bytes[offset+3] = particle.active ? 1 : 0;
		bytes[offset+4] = particle.transitionPossible ? 1 : 0;
	},
	fromBytes: function(bytes, offset){
		this.ensureTypeArray();
		var particle = this.create(this.types[bytes[offset]])
		particle.notMoved 			= bytes[offset+1];		
		particle.wasSwapped 		= bytes[offset+2] > 0;
		particle.active 			= bytes[offset+3] > 0;
		particle.transitionPossible = bytes[offset+4] > 0;
		return particle;
	},
	byteSize: 5
}