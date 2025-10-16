(function(){
	/** Build dots from sections */
	const container = document.getElementById('fullpage');
	const sections = Array.from(container.querySelectorAll('.fp-section'));
	const dotsNav = document.querySelector('.fp-dots');
	sections.forEach((s, idx)=>{
		const btn = document.createElement('button');
		btn.className = 'fp-dot';
		btn.type = 'button';
		btn.title = s.dataset.label || `Секция ${idx+1}`;
		btn.setAttribute('aria-label', btn.title);
		btn.addEventListener('click', ()=> scrollToIndex(idx));
		dotsNav.appendChild(btn);
	});
	const dots = Array.from(dotsNav.children);

	/** Snap helpers */
	let isAnimating = false;
	let currentIndex = 0;
	let scrollTimeout = null;
	let programmaticScroll = false;
	let lastScrollTop = 0;
	let scrollEndTimeout = null;
	
	// Detect when scroll ends (including snap)
	container.addEventListener('scroll', ()=>{
		if(scrollEndTimeout) clearTimeout(scrollEndTimeout);
		scrollEndTimeout = setTimeout(()=>{
			// Scroll has ended
			if(programmaticScroll){
				programmaticScroll = false;
				isAnimating = false;
				if(scrollTimeout) clearTimeout(scrollTimeout);
				scrollTimeout = null;
			}
		}, 150);
		lastScrollTop = container.scrollTop;
	});
	
	function scrollToIndex(index){
		if(index<0 || index>=sections.length || isAnimating) return;
		// Clear any pending scroll
		if(scrollTimeout) clearTimeout(scrollTimeout);
		
		isAnimating = true;
		programmaticScroll = true;
		currentIndex = index;
		const top = sections[index].offsetTop;
		
		container.scrollTo({ top, behavior:'smooth' });
		updateDots(index);
		
		// Backup timeout in case scroll event doesn't fire
		scrollTimeout = setTimeout(()=>{ 
			isAnimating=false;
			programmaticScroll = false;
			scrollTimeout = null;
		}, 1500);
	}
	function updateDots(activeIdx){
		dots.forEach((d,i)=> d.setAttribute('aria-current', i===activeIdx ? 'true':'false'));
	}
	/** Check if section can be scrolled further */
	function canScrollInSection(section, direction){
		// Only check for sections with auto height
		if(section.id !== 'selectors-one' && section.id !== 'selectors-two') return false;
		const hasScroll = section.scrollHeight > window.innerHeight;
		if(!hasScroll) return false;
		// Calculate scroll position within section
		const sectionTop = section.offsetTop;
		const containerScrollTop = container.scrollTop;
		const scrollInSection = containerScrollTop - sectionTop;
		const maxScroll = section.scrollHeight - window.innerHeight;
		if(direction > 0) return scrollInSection < maxScroll - 10; // scrolling down
		return scrollInSection > 10; // scrolling up
	}
	/** Wheel/keys */
	let wheelLock = false;
	let scrollAccumulator = 0;
	let lastScrollTime = Date.now();
	let lastDirection = 0;
	
	container.addEventListener('wheel', (e)=>{
		const delta = Math.sign(e.deltaY);
		const currentSection = sections[currentIndex];
		
		// Check if we need to scroll inside section first
		if(canScrollInSection(currentSection, delta)){
			scrollAccumulator = 0;
			return; // let natural scroll happen
		}
		
		// Prevent default scroll when not inside scrollable section
		e.preventDefault();
		
		if(wheelLock || isAnimating){
			return;
		}
		
		// Detect trackpad vs mouse wheel
		// Trackpad: many small deltaY values (typically < 50)
		// Mouse wheel: fewer large deltaY values (typically > 50)
		const isTouchpad = Math.abs(e.deltaY) < 50;
		const scrollThreshold = isTouchpad ? 800 : 400;
		
		const now = Date.now();
		const timeDiff = now - lastScrollTime;
		
		// Reset accumulator if direction changed or too much time passed
		if(delta !== lastDirection || timeDiff > 300){
			scrollAccumulator = 0;
		}
		
		lastScrollTime = now;
		lastDirection = delta;
		
		// Accumulate scroll
		scrollAccumulator += Math.abs(e.deltaY);
		
		// Check if threshold reached
		if(scrollAccumulator >= scrollThreshold){
			wheelLock = true;
			scrollAccumulator = 0;
			if(delta>0) scrollToIndex(currentIndex+1);
			else if(delta<0) scrollToIndex(currentIndex-1);
			setTimeout(()=> {
				wheelLock=false;
				lastDirection = 0;
			}, 1000);
		}
	}, { passive:false });
	window.addEventListener('keydown', (e)=>{
		if(isAnimating) return;
		const currentSection = sections[currentIndex];
		if(e.key==='ArrowDown' || e.key==='PageDown'){
			if(canScrollInSection(currentSection, 1)) return;
			scrollToIndex(currentIndex+1);
		}
		if(e.key==='ArrowUp' || e.key==='PageUp'){
			if(canScrollInSection(currentSection, -1)) return;
			scrollToIndex(currentIndex-1);
		}
		if(e.key==='Home') scrollToIndex(0);
		if(e.key==='End') scrollToIndex(sections.length-1);
	});
	/** Touch */
	let touchStartY = null;
	container.addEventListener('touchstart', (e)=>{ touchStartY = e.touches[0].clientY; }, { passive:true });
	container.addEventListener('touchmove', (e)=>{
		if(touchStartY===null || isAnimating) return;
		const dy = e.touches[0].clientY - touchStartY;
		if(Math.abs(dy) > 50){
			const currentSection = sections[currentIndex];
			const direction = dy < 0 ? 1 : -1;
			if(canScrollInSection(currentSection, direction)){
				touchStartY = e.touches[0].clientY;
				return;
			}
			if(dy < 0) scrollToIndex(currentIndex+1);
			else scrollToIndex(currentIndex-1);
			touchStartY = null;
		}
	}, { passive:true });
	container.addEventListener('touchend', ()=>{ touchStartY = null; }, { passive:true });
	/** Keep section height = viewport */
	function resize(){
		sections.forEach(s=> {
			// Skip sections that should be scrollable
			if(s.id === 'selectors-one' || s.id === 'selectors-two'){
				s.style.height = 'auto';
				s.style.minHeight = `${window.innerHeight}px`;
			} else {
				s.style.height = `${window.innerHeight}px`;
			}
		});
		// Only scroll if not animating
		if(!isAnimating){
			const top = sections[currentIndex].offsetTop;
			container.scrollTo({ top, behavior:'auto' }); // instant, not smooth
		}
	}
	window.addEventListener('resize', resize);
	resize();
	
	/** Scale selectors-grid to fit viewport */
	function scaleSelectorsGrid(){
		const viewportHeight = window.innerHeight;
		const grids = document.querySelectorAll('.selectors-grid');
		
		grids.forEach(grid => {
			const section = grid.closest('.fp-section');
			if(!section) return;
			
			// Get available height (viewport minus header ~200px and bottom padding 80px)
			const availableHeight = viewportHeight - 200 - 80;
			
			// Get actual grid height
			grid.style.transform = 'scale(1)';
			const gridHeight = grid.scrollHeight;
			
			// Calculate scale needed
			if(gridHeight > availableHeight){
				const scale = availableHeight / gridHeight;
				grid.style.transform = `scale(${Math.max(scale, 0.5)})`; // min scale 0.5
			} else {
				grid.style.transform = 'scale(1)';
			}
		});
	}
	
	scaleSelectorsGrid();
	window.addEventListener('resize', scaleSelectorsGrid);
	
	/** Move visual elements to product section root */
	document.querySelectorAll('.product .product-grid > .visual').forEach(visual => {
		const productSection = visual.closest('.product');
		if(productSection){
			productSection.appendChild(visual);
		}
	});
	
	/** Align facts height across all products */
	function alignFactsHeight(){
		const allFacts = document.querySelectorAll('.product .facts');
		if(allFacts.length === 0) return;
		
		// Reset height first
		allFacts.forEach(facts => facts.style.height = 'auto');
		
		// Find max height
		let maxHeight = 0;
		allFacts.forEach(facts => {
			const height = facts.offsetHeight;
			if(height > maxHeight) maxHeight = height;
		});
		
		// Apply max height to all
		allFacts.forEach(facts => {
			facts.style.height = `${maxHeight}px`;
		});
	}
	
	alignFactsHeight();
	window.addEventListener('resize', alignFactsHeight);

	/** Horizontal parallax for product visuals on vertical scroll */
	function updateProductCoversOnScroll(){
		const viewportH = window.innerHeight;
		const productSections = document.querySelectorAll('.product');
		productSections.forEach(section => {
			const visual = section.querySelector('.visual');
			if(!visual) return;
			const cover = visual.querySelector('.cover');
			if(!cover) return;
			const rect = section.getBoundingClientRect();
			// progress: 0 at top enters, 1 at bottom leaves
			const progress = Math.min(1, Math.max(0, (viewportH - rect.top) / (viewportH + rect.height)));
			// Map to -30% .. 30% translateX range
			const tx = (progress * 60) - 30; 
			cover.style.setProperty('--cover-x', tx + '%');
		});
	}

	updateProductCoversOnScroll();
	container.addEventListener('scroll', updateProductCoversOnScroll, { passive:true });
	window.addEventListener('resize', updateProductCoversOnScroll);
	
	/** Handle selector-item links */
	document.querySelectorAll('.selector-item').forEach(link => {
		link.addEventListener('click', (e)=>{
			e.preventDefault();
			const targetId = link.getAttribute('href').substring(1);
			const targetIndex = sections.findIndex(s => s.id === targetId);
			if(targetIndex >= 0){
				scrollToIndex(targetIndex);
			}
		});
	});
	
	/** Observe active section for initial state and manual scroll */
	const io = new IntersectionObserver((entries)=>{
		entries.forEach(entry=>{
			if(entry.isIntersecting && !isAnimating && !programmaticScroll){
				const idx = sections.indexOf(entry.target);
				if(idx !== currentIndex && idx >= 0){
					currentIndex = idx;
					updateDots(idx);
				}
			}
		});
	}, { root: container, threshold: 0.5 });
	sections.forEach(s=> io.observe(s));
	// Init
	updateDots(0);
})();

