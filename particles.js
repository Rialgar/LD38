window.PARTICLES = {
	specs: {
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
					probability: 0.01,
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
			weight: 1000
		}
	},
	create: function(name){
		var spec = this.specs[name];
		if(!spec){
			throw new Error('No such particle: ' + name);					
		}
		if(!spec.name){
			spec.name = name;
			if(spec.transitions){
				spec.hasTransitionRequirements = false;
				spec.transitions.forEach(function(t){
					if(t.requirement){
						spec.hasTransitionRequirements = true;
					}
				});
			}
		}
		var out = {};
		for(var key in spec){
			out[key] = spec[key];
		}
		out.notMoved = 0;
		out.wasSwapped = false;
		out.active = true;
		out.transitionPossible = false;

		return out;
	}
}