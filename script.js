(function(){
	/** Build custom dots navigation first */
	const container = document.getElementById('fullpage');
	const sections = Array.from(container.querySelectorAll('.section'));
	const dotsNav = document.querySelector('.fp-dots');
	sections.forEach((s, idx)=>{
		const btn = document.createElement('button');
		btn.className = 'fp-dot';
		btn.type = 'button';
		btn.title = s.dataset.label || `Секция ${idx+1}`;
		btn.setAttribute('aria-label', btn.title);
		btn.addEventListener('click', ()=> {
			if(window.fullpage_api && typeof window.fullpage_api.moveTo === 'function'){
				window.fullpage_api.moveTo(idx+1);
			}
		});
		dotsNav.appendChild(btn);
	});
	const dots = Array.from(dotsNav.children);

	function updateDots(activeIdx){
		dots.forEach((d,i)=> d.setAttribute('aria-current', i===activeIdx ? 'true':'false'));
	}
	
	// Init dots state
	updateDots(0);

	/** Initialize fullPage.js */
	const FPConstructor = window.fullpage || window.Fullpage || window.FullPage;
	if(typeof FPConstructor === 'function'){
		new FPConstructor('#fullpage', {
			licenseKey: 'gplv3-license',
			autoScrolling: true,
			scrollHorizontally: false,
			fitToSection: true,
			fitToSectionDelay: 300,
			scrollingSpeed: 700,
			keyboardScrolling: true,
			sectionSelector: '.section',
			navigation: false,
			css3: true,
			easingcss3: 'ease-in-out',
			touchSensitivity: 15,
			normalScrollElements: '',
			scrollOverflow: false,
			scrollBar: false,
			paddingTop: 0,
			paddingBottom: 0,
			fixedElements: '.fp-dots',
			responsiveWidth: 0,
			responsiveHeight: 0,
			responsiveSlides: false,
			parallax: false,
			parallaxOptions: {type: 'reveal', percentage: 62, property: 'translate'},
			cards: false,
			cardsOptions: {perspective: 100, fadeContent: true, fadeBackground: true},
			credits: { enabled: true, label: 'Made with fullPage.js', position: 'right' },
			onLeave: function(origin, destination, direction, trigger){
				// Update custom dots navigation
				updateDots(destination.index);
				// Toggle scroll-to-top button visibility (only from #colors and below)
				const scrollTopBtnInline = document.querySelector('.scroll-top');
				if(scrollTopBtnInline){
					const colorsStartIndex = (function(){
						const idx = sections.findIndex(s => s.id === 'colors');
						return idx >= 0 ? idx : 2;
					})();
					scrollTopBtnInline.classList.toggle('hidden', destination.index < colorsStartIndex);
				}
			},
		afterRender: function(){
			// Ensure proper layout after fullPage.js initializes
			scaleSelectorsGrid();
			alignFactsHeight();
		},
		afterResize: function(width, height){
			scaleSelectorsGrid();
			alignFactsHeight();
		}
		});
	} else {
		console.error('fullPage.js constructor not found');
	}
	
	/** Scale selectors-grid to fit viewport */
	function scaleSelectorsGrid(){
		const viewportHeight = window.innerHeight;
		const grids = document.querySelectorAll('.selectors-grid');
		
		grids.forEach(grid => {
			const section = grid.closest('.section');
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

	/** Tech columns hover animation */
	const columnsWrapper = document.querySelector('.tech-columns .columns-wrapper');
	if(columnsWrapper){
		const columns = Array.from(columnsWrapper.querySelectorAll('.column'));
		
		columns.forEach(column => {
			column.addEventListener('mouseenter', function(){
				// Add expand class to hovered column
				this.classList.add('column-expand');
				// Add shrink class to other columns
				columns.forEach(col => {
					if(col !== this){
						col.classList.add('column-shrink');
					}
				});
			});
			
			column.addEventListener('mouseleave', function(){
				// Remove all classes on mouse leave
				columns.forEach(col => {
					col.classList.remove('column-expand', 'column-shrink');
				});
			});
		});
	}

	
	/** Handle selector-item links */
	const selectorsSections = document.querySelectorAll('.section.selectors');
	selectorsSections.forEach(section => {
		const visualCards = Array.from(section.querySelectorAll('.selector-visual .selector-card'));
		const textItems = Array.from(section.querySelectorAll('.selector-text .selector-item'));

		// Sync hover: dim others
		function setHover(idx){
			section.classList.add('hovering');
			section.classList.remove('hover-0','hover-1','hover-2');
			section.classList.add(`hover-${idx}`);
		}
		function clearHover(){
			section.classList.remove('hovering','hover-0','hover-1','hover-2');
		}

		visualCards.forEach((card, idx)=>{
			card.addEventListener('mouseenter', ()=> setHover(idx));
			card.addEventListener('mouseleave', clearHover);
			card.addEventListener('click', ()=>{
				// click navigates using paired textItems link
				const link = textItems[idx];
				if(!link) return;
				const targetId = link.getAttribute('href').substring(1);
				const targetIndex = sections.findIndex(s => s.id === targetId);
				if(targetIndex >= 0 && window.fullpage_api){
					window.fullpage_api.moveTo(targetIndex + 1);
				}
			});
		});

		// Disable default text link click hover, but keep navigation unified
		textItems.forEach((link, idx)=>{
			link.addEventListener('mouseenter', ()=> setHover(idx));
			link.addEventListener('mouseleave', clearHover);
			link.addEventListener('click', (e)=>{
				e.preventDefault();
				// unify with card click
				const targetId = link.getAttribute('href').substring(1);
				const targetIndex = sections.findIndex(s => s.id === targetId);
				if(targetIndex >= 0 && window.fullpage_api){
					window.fullpage_api.moveTo(targetIndex + 1);
				}
			});
		});
	});
	
	/** Mattress animation on hover */
	const productColorsSection = document.querySelector('.product-colors');
	if(productColorsSection){
		const firstLeft = productColorsSection.querySelector('.first-left');
		const secondLeft = productColorsSection.querySelector('.second-left');
		const mattressesStack = productColorsSection.querySelector('.mattresses-stack');
		
		if(firstLeft && secondLeft && mattressesStack){
			// Add hover listeners to first-left (animates mattress-top)
			firstLeft.addEventListener('mouseenter', function(){
				mattressesStack.classList.add('mattress-top-animate');
				productColorsSection.classList.add('first-hover');
			});
			
			firstLeft.addEventListener('mouseleave', function(){
				mattressesStack.classList.remove('mattress-top-animate');
				productColorsSection.classList.remove('first-hover');
			});
			
			// Add hover listeners to second-left (animates mattress-bottom)
			secondLeft.addEventListener('mouseenter', function(){
				mattressesStack.classList.add('mattress-bottom-animate');
				productColorsSection.classList.add('second-hover');
			});
			
			secondLeft.addEventListener('mouseleave', function(){
				mattressesStack.classList.remove('mattress-bottom-animate');
				productColorsSection.classList.remove('second-hover');
			});
		}
	}

	/** Hide fullPage.js watermark */
	window.addEventListener('load', function(){
		const watermark = document.querySelector('.fp-watermark');
		if(watermark){
			watermark.style.opacity = '0';
			watermark.style.pointerEvents = 'none';
			watermark.style.userSelect = 'none';
		}

		// Scroll to top (hero) button
		const scrollTopBtn = document.querySelector('.scroll-top');
		if(scrollTopBtn){
			scrollTopBtn.addEventListener('click', ()=>{
				if(window.fullpage_api && typeof window.fullpage_api.moveTo === 'function'){
					window.fullpage_api.moveTo(1);
				} else {
					const hero = document.getElementById('hero');
					if(hero){ hero.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
				}
			});

			// visibility without fullPage: show only when #colors not fully in view top
			const updateScrollTopVisibility = (activeIdx)=>{
				if(typeof activeIdx === 'number'){
					const colorsStartIndex = (function(){
						const idx = sections.findIndex(s => s.id === 'colors');
						return idx >= 0 ? idx : 2;
					})();
					scrollTopBtn.classList.toggle('hidden', activeIdx < colorsStartIndex);
					return;
				}
				// fallback: check if we scrolled past #colors
				const colors = document.getElementById('colors');
				if(!colors) return;
				const rect = colors.getBoundingClientRect();
				const beforeColors = rect.top >= 0; // still above colors
				scrollTopBtn.classList.toggle('hidden', beforeColors);
			};

			// with fullPage.js
			if(window.fullpage_api){
				updateScrollTopVisibility(0);
				// hook into onLeave already set above
				const origOnLeave = typeof FPConstructor === 'function' ? null : null; // placeholder (already handled above)
			} else {
				updateScrollTopVisibility();
				window.addEventListener('scroll', ()=> updateScrollTopVisibility());
			}
		}
	});
})();
