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

    /** Minimal slider state */
    let isAnimating = false;
    let currentIndex = 0;
    let scrollEndTimeout = null;
    let wheelAccumulator = 0;
    let lastWheelTime = 0;
    let lastWheelDir = 0;
	
    // When scroll settles, snap state to nearest section and unlock
    container.addEventListener('scroll', ()=>{
        if(scrollEndTimeout) clearTimeout(scrollEndTimeout);
        scrollEndTimeout = setTimeout(()=>{
            const vh = window.innerHeight;
            const idx = Math.max(0, Math.min(sections.length-1, Math.round(container.scrollTop / vh)));
            currentIndex = idx;
            updateDots(idx);
            isAnimating = false;
        }, 140);
    });
	
    function scrollToIndex(index){
        if(index<0 || index>=sections.length || isAnimating) return;
        isAnimating = true;
        currentIndex = index;
        const top = sections[index].offsetTop;
        container.scrollTo({ top, behavior:'smooth' });
        updateDots(index);
        // reset accumulators to kill momentum
        wheelAccumulator = 0;
        lastWheelDir = 0;
        setTimeout(()=>{ isAnimating = false; }, 900);
    }
	function updateDots(activeIdx){
		dots.forEach((d,i)=> d.setAttribute('aria-current', i===activeIdx ? 'true':'false'));
	}
    // No inner-section scrolling; every section is exactly 100vh
	/** Wheel/keys */
	let wheelLock = false;
	let scrollAccumulator = 0;
	let lastScrollTime = Date.now();
	let lastDirection = 0;
	
    container.addEventListener('wheel', (e)=>{
        // prevent natural scroll to keep full control
        e.preventDefault();
        const dir = Math.sign(e.deltaY);
        if(dir === 0) return;
        const now = performance.now();
        const timeDiff = now - lastWheelTime;
        if(dir !== lastWheelDir || timeDiff > 300){
            wheelAccumulator = 0;
        }
        lastWheelTime = now;
        lastWheelDir = dir;
        // Accumulate in pixel-equivalents; deltaMode 0=pixels, 1=lines (~16px)
        const deltaPx = Math.min(120, Math.abs(e.deltaY) * (e.deltaMode === 1 ? 16 : 1));
        wheelAccumulator += deltaPx;
        // Threshold proportional to viewport height; larger for products
        const vh = window.innerHeight;
        const currentSection = sections[currentIndex];
        const isProduct = currentSection && currentSection.classList.contains('product');
        const thresholdPx = (isProduct ? 1.25 : 0.95) * vh;
        if(!isAnimating && wheelAccumulator >= thresholdPx){
            wheelAccumulator = 0;
            scrollToIndex(currentIndex + (dir>0 ? 1 : -1));
        }
    }, { passive:false });
    window.addEventListener('keydown', (e)=>{
        if(isAnimating) return;
        if(e.key==='ArrowDown' || e.key==='PageDown') scrollToIndex(currentIndex+1);
        if(e.key==='ArrowUp' || e.key==='PageUp') scrollToIndex(currentIndex-1);
        if(e.key==='Home') scrollToIndex(0);
        if(e.key==='End') scrollToIndex(sections.length-1);
    });
	/** Touch */
    let touchStartY = null;
	container.addEventListener('touchstart', (e)=>{ touchStartY = e.touches[0].clientY; }, { passive:true });
    container.addEventListener('touchmove', (e)=>{
        if(touchStartY===null || isAnimating) return;
        const dy = e.touches[0].clientY - touchStartY;
        const currentSection = sections[currentIndex];
        const isProduct = currentSection && currentSection.classList.contains('product');
        const vh = window.innerHeight;
        const thr = (isProduct ? 0.20 : 0.12) * vh;
        if(Math.abs(dy) > thr){
            if(dy < 0) scrollToIndex(currentIndex+1);
            else scrollToIndex(currentIndex-1);
            touchStartY = null;
        }
	}, { passive:true });
	container.addEventListener('touchend', ()=>{ touchStartY = null; }, { passive:true });
	/** Keep section height = viewport */
    function resize(){
        sections.forEach(s=> {
            // Force all sections to exact viewport height
            s.style.height = `${window.innerHeight}px`;
            s.style.minHeight = `${window.innerHeight}px`;
            s.style.overflow = 'hidden';
        });
		// Only scroll if not animating
		if(!isAnimating){
			const top = sections[currentIndex].offsetTop;
            container.scrollTo({ top, behavior:'auto' });
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

