YUI({
    skin: {
    }
}).use("slider", "io", "json-parse", function (Y) {

function Carousel(belazy){

    this.bar = Y.one('.loading-section .bar');
    this.loadtext = Y.one('.loading-section .text');
    this.loadmsgs = [
        'Adding monkey parts...',
        'Adding pony parts...',
        'Reticulating splines...',
        'Flogging Scarface...',
        'Mucking a sluice-box...',
        'Deploying Pirate Roderick...',
        'Making way for the King...',
        'Assembling Steptos...',
        'Dodging snorks...',
        'Tuning a ukulele...',
        'Requesting a King Hat...',
        'Analyzing a frieze pattern...',
        'Donning fancy pants...',
        // Thanks Peter!
        'Possibly turning clocks back...',
        'Not actually turning clocks back...',
        'Sharpening pencils really slowly...'
    ];

    // Use a custom thumb and width
    var slider = new Y.Slider({
        length : '887px',
        min: 0,
        max: 887,
        clickableRail: true
    });
    slider.renderRail = function () {
        return Y.one( "#slider span.yui3-slider-rail" );
    };
    slider.renderThumb = function () {
        return this.rail.one( "span.yui3-slider-thumb" );
    };
    slider.render('#slider');
    slider.on('slideEnd', this.slideEnd, this); 
    var careaboutchange = false;
    slider.on('railMouseDown', function(e){ 
        careaboutchange = true; 
    }, this); 
    slider.on('valueChange', function(e){
        if(careaboutchange){
            careaboutchange = false;
            this.slideEnd(e, e.newVal);
        }
    }, this);


    this.stops = [0, 159, 305, 452, 594, 740, 887];

    this.slider = slider;
    this.markers = Y.all('.marker');
    this.slide = Y.one('.slide');
    this.current = 0;
    this.pages = Y.all('.photo-day');
    this.width = 760;

    this.contribslide = Y.one('.contriband');
    this.contribpages = Y.all('.name-list');

    this.resizeCarousel();
    Y.on('resize', this.resizeCarousel, window, this, true);
    Y.on('orientationchange', this.resizeCarousel, null, this, true);
    

    this.initializing = true;

    this.full = Y.one('#full');
    var vwidth = this.full.get('winWidth');
    if(vwidth < 1050){
        this.full.addClass('smaller');
    }

    this.belazy = belazy;

    this.mask = Y.one('#mask');
    this.mask.on('click', this.maskClick, this, true);

    this.photoClickLocked = false;

    this.bundles = [];

    this.bar.setStyle('width', '160px');
    this.loadText();


    this.changeFrame(0);
};

Carousel.prototype.resizeCarousel = function(){
    var vheight = this.slide.get('winHeight');
    // 100 for header, 100 for rope
    this.height = vheight - 200;
    this.contribheight = this.height - 36;


    // Bundles are 340 tall
    this.bundlesvisible = Math.ceil(vheight / 340);

    Y.all('.vheight').setStyle('height', this.height+'px');
    Y.one('#contribframe').setStyle('height', this.contribheight+'px');
    this.contribpages.setStyle('height', this.contribheight+'px');

    var newtop = this.current * (this.contribheight+20) * -1;
    this.contribslide.setStyle('top', newtop+'px');


};

Carousel.prototype.slideEnd = function(e, value){
    if(value==null){
        value = parseInt(this.slider.get('value'),10);
    }
    i = 0;
    while(value > this.stops[i]){
        i++;   
    }

    if(value!=this.stops[i]){
        var high = this.stops[i];
        var low = this.stops[i-1];
        var diff = high - low;
        var snapval = (((value - low) / diff) > 0.5 ? high : low);
        i = (snapval==high) ? i : i-1;
        this.slider.set('value', snapval);
    }
    this.markers.removeClass('hover');
    this.markers.item(i).addClass('hover');
    this.changeFrame(i);
};

Carousel.prototype.changeFrame = function(i){
    if(!this.initializing && this.current == i){
        return;
    }

    var newframe = this.pages.item(i);
    if(!newframe.getData('hasdata')){
        var url = 'ajax.php?mode=day&day='+(i+1)
        var cfg = { method: "GET", on: { complete: this.processDay, failure: this.error }, context: this, arguments: {day: i}};
        Y.io(url, cfg);
        if(this.initializing){
            this.bar.setStyle('width', '220px');
            this.loadText();

        }
    }else{
        var newleft = i * this.width * -1;
        this.slide.setStyle('left', newleft+'px');
        this.current = i;

        var newtop = i * (this.contribheight+20) * -1;
        this.contribslide.setStyle('top', newtop+'px');
    }
};

Carousel.prototype.processDay = function(tid, o, i){
    var day = i.day;
    try{
        var data = Y.JSON.parse(o.responseText);
        if(data===false){
            this.error();
        }
        if(this.initializing){
            this.bar.setStyle('width', '300px');
            this.loadText();
        }
        var page = this.pages.item(day);
        page.setContent(data.imgs);

        var imgs = page.all('img');
        imgs.on('click', this.handlePhotoClick, this, true);
        
        var names = this.contribpages.item(day);
        names.setContent(data.names);
               
        page.setData('hasdata', true);


        var bundles = page.all('.bundle');

        if(this.belazy){
            for(var j=0;j<this.bundlesvisible;j++){
                var bundle = bundles.shift();
                this.loadBundle(bundle);            
            }
            this.bundles[day] = bundles;

            page.on('scroll', function(e){
                if(!this.bundles[this.current] || this.bundles[this.current].length===0){
                    return;
                }

                var scroll = e.currentTarget.get('scrollTop');
                var nexttop = this.bundles[this.current].item(0).get('offsetTop');
                while(Math.abs(nexttop - scroll) < 850){
                    var bundle = this.bundles[this.current].shift();
                    this.loadBundle(bundle);
                    nexttop = this.bundles[this.current].item(0).get('offsetTop');
                }
                
                
            }, this, true);
        }else{
            bundles.each(function(bundle){
                this.loadBundle(bundle);
            }, this);
        }


        if(this.initializing){
            this.youCanComeIn();
        }else{
            this.changeFrame(day);
        }

    }catch(e){
        this.error();
    }

};

Carousel.prototype.youCanComeIn = function(){
    this.initializing = false;
    this.bar.setStyle('width', '400px');
    this.loadText();
    setTimeout(function(){
        Y.one('.gate').setStyle('opacity', '0');
        setTimeout(function(){
            Y.one('.gate').setStyle('display', 'none');
        }, 1100);
    }, 500);
};

Carousel.prototype.error = function(){

    this.photoClickLocked = true;
};

Carousel.prototype.loadBundle = function(bundle){
    var imgs = bundle.all('img');
    imgs.each(function(img){
        img.set('src', img.getAttribute('data-src'));
    });
    bundle.removeClass('unloaded');
};

Carousel.prototype.handlePhotoClick = function(e){
    if(this.photoClickLocked){
        return;
    }

    this.photoClickLocked = true;
    var img = e.currentTarget;
    var id = img.getAttribute('data-id');
    var url = 'ajax.php?mode=full&id='+encodeURIComponent(id);
    
    var cfg = { method: "GET", on: { complete: this.handlePhotoData, failure: this.error }, context: this};
    Y.io(url, cfg);

};

Carousel.prototype.handlePhotoData = function(tid, o){
    try{
        var data = Y.JSON.parse(o.responseText);

        var img = this.full.one('#full-img');
        img.setAttribute('class', data.orientation);
        
        var title = this.full.one('.title');
        title.setContent(data.title);
        title.set('href', data.pageurl);
        var author = this.full.one('.author');
        author.setContent(data.username);
        author.set('href', data.userurl);
        
        var that = this;
        var imgobj = new Image();
        imgobj.onload = function(){
            img.set('src', data.img);
            setTimeout(function(){
                that.full.setStyle('display', 'block');

                var fheight = that.full.get('offsetHeight');
                var fwidth = that.full.get('offsetWidth');
                var vheight = that.full.get('winHeight');
                var vwidth = that.full.get('winWidth');

                that.full.setXY([ Math.floor((vwidth-fwidth)/2), Math.floor((vheight-fheight)/2)]);


                that.mask.setStyle('height', that.mask.get('docHeight')+'px');
                that.mask.setStyle('width', that.mask.get('docWidth')+'px');
                that.mask.setStyle('display', 'block');
                that.full.setStyle('display', 'block');
                that.photoClickLocked = false;
            }, 200);

        }
        imgobj.src = data.img;
    }catch(e){
        this.error();
    }
};

Carousel.prototype.maskClick = function(e){
    this.full.setStyle('display', 'none');
    this.mask.setStyle('display', 'none');
};

Carousel.prototype.loadText = function(){
    var i = Math.floor(Math.random() * this.loadmsgs.length);
    var text = this.loadmsgs.splice(i, 1)[0];   
    this.loadtext.setContent(text);
};

Y.on('domready', function(){
    window.scrollTo(0,1);
    var ua = navigator.userAgent.toLowerCase();
    belazy = false;
    if(ua.match(/ipad/i) || ua.match(/iphone/i) || ua.match(/android/)){
        belazy = true;
    }
    if(belazy && !document.cookie.match(/warned=yes/)){
        Y.one('.warning').setStyle('display', 'block');
        Y.one('.warning .button').on('click', function(){
            document.cookie = 'warned=yes';
            Y.one('.warning').setStyle('display', 'none');
            Y.carousel = new Carousel(belazy);      
        });

    }else{
        Y.carousel = new Carousel(belazy);
    }
});

});
