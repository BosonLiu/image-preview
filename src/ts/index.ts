
export default class ImgPreview{
    // 上次点击时间和执行单击事件的计时器
    [key:string]: any;
    public lastClick: number = -Infinity;
    public performerClick: any;
    public threshold: number;//阈值 手指移动超过这个值则切换下一屏幕
    public startX: number;//手指移动时的x起始坐标
    public touchStartX: number;//手指第一次点击时的x起点坐标
    public startY: number;//手指移动时的y起始坐标
    public touchStartY: number; //手指第一次点击时的y起点坐标
    public curIndex: number = 0;//当前第几个图片
    public imgContainerMoveX: number = 0;//图片容器x轴的移动距离
    public imgContainerMoveY: number = 0;//图片容器y轴的移动距离
    public screenWidth: number ;//屏幕宽度
    public imgsNumber: number = 4;//图片数量
    public step: number = 10; //动画每帧的位移
    public zoomScale: number = 0.025;//缩放比例
    public isZooming: boolean = false; //是否在进行双指缩放

    public curPoint1: { x: number, y: number };//双指缩放时的第一个点
    public curPoint2: { x: number, y: number };//双指缩放的第二个点
    
    public curStartPoint1: { x: number, y: number };//双指缩放时的第一个起点
    public curStartPoint2: { x: number, y: number };//双指缩放的第二个起点

    public maxMoveX: number; // 滑动时的最大距离
    public minMoveX: number; // 滑动时的最小距离

    public isAnimating: boolean = false; // 是否在动画中

    public prefix:string = "__"
    public ref: HTMLElement ;
    public imgContainer: HTMLElement;
    public imgItems: NodeListOf < HTMLElement >;

    public operateMaps: {
        [key: string]: string
    } = {
        rotateLeft: 'handleRotateLeft'
    }
    
    constructor( options: Object ){
        this.genFrame();
        
        this.screenWidth = this.ref.getBoundingClientRect().width;
        this.threshold = this.screenWidth / 4;
        this.imgContainer = this.ref.querySelector(`.${this.prefix}imgContainer`);
        this.imgItems = this.imgContainer.querySelectorAll(`.${this.prefix}item`);

        this.reCordInitialData( this.imgItems );
        this.maxMoveX = this.screenWidth / 2;
        this.minMoveX = -this.screenWidth * (this.imgsNumber - 0.5);
        
        this.ref.addEventListener('touchstart',this.handleTouchStart.bind(this));
        this.ref.addEventListener('touchmove',this.handleMove.bind(this));
        this.ref.addEventListener('touchend',this.handleToucnEnd.bind(this));
    }
    reCordInitialData( els:  NodeListOf < HTMLElement > ){
        
        els.forEach( ( el,key,parent) => {
            let styleObj: ClientRect = el.getBoundingClientRect();
            el.dataset.initialWidth = styleObj.width.toString();
            el.dataset.initialHeight =  styleObj.height.toString();

        })

    }
    handleTouchStart(e: TouchEvent & MouseEvent){
        switch( e.touches.length ){
            case 1:
                this.handleOneStart(e);
                break;
            case 2:
                this.handleTwoStart(e);
                break;
            default:
                break;
                
        }
        
    }
    handleOneStart(e: TouchEvent & MouseEvent ) :void{
        /**
         * 这里把操作派发
         */
        const type : string = (<HTMLElement>(e.target)).dataset.type;
    
        if( this.operateMaps[type] ){
            this[this.operateMaps[type]](e);
            return
        }
        this.touchStartX = this.startX = Math.round(e.touches[0].pageX);
        this.touchStartY = this.startY = Math.round(e.touches[0].pageY);
        
        let now = (new Date()).getTime();

        if( now - this.lastClick < 500 ){
            /*
                启动一个定时器，如果双击事件发生后就
                取消单击事件的执行
             */
            clearTimeout( this.performerClick )
            this.handleDoubleClick(e);
            
        }else{
            this.performerClick = setTimeout(() => {
                this.handleClick(e);
            },500)
            
        }
        this.lastClick = (new Date()).getTime();
    }
    handleRotateLeft(e: TouchEvent & MouseEvent ) :void{
        const curItem: HTMLElement = this.imgItems[this.curIndex];
        let rotateDeg:number;

        if( curItem.dataset.rotateDeg ){
            rotateDeg = Number(curItem.dataset.rotateDeg)
        }else{
            rotateDeg = 0
        }
        rotateDeg -= 90;

        curItem.style.cssText += `
            transition: transform 0.5s;
            transform: rotateZ( ${rotateDeg}deg );
        `
        curItem.dataset.rotateDeg = rotateDeg.toString();

    }
    handleTwoStart(e: TouchEvent & MouseEvent ) :void{
        this.curPoint1 = {
            x: e.touches[0].pageX,
            y: e.touches[0].pageY
        };
        this.curPoint2 = {
            x: e.touches[1].pageX,
            y: e.touches[1].pageY
        };
    }
    handleClick(e:MouseEvent){
        console.log('click')
    }
    handleDoubleClick(e: TouchEvent & MouseEvent){
        if( this.isAnimating ) return;
        this.isAnimating = true;
        let mouseX: number = e.touches[0].pageX;
        let mouseY: number = e.touches[0].pageY;

        const curItem: HTMLElement = this.imgItems[this.curIndex];
        const curImg: HTMLImageElement = curItem.querySelector('img');

        const curItemWidth: number = curItem.getBoundingClientRect().width;
        const curItemHeight: number = curItem.getBoundingClientRect().height;

        // 以下为旋转之后校正transform-origin时需要用到的参数
        const curItemViewTop: number = curItem.getBoundingClientRect().top;//当前元素距离视口的top
        const curItemViewBottom: number = curItem.getBoundingClientRect().bottom;//当前元素距离视口的bottom
        const curItemViewLeft: number = curItem.getBoundingClientRect().left;//当前元素距离视口的left

        let rotateDeg: number = Number(curItem.dataset.rotateDeg || '0');

        let maxWidth: number ;
        if( curImg.naturalWidth > curItemWidth ){
            maxWidth = curImg.naturalWidth
        }else{
             maxWidth = curItemWidth
        }

        let maxHeight: number ;
        if( curImg.naturalHeight > curItemHeight ){
            maxHeight = curImg.naturalHeight;
        }else{
            maxHeight = curItemHeight;
        }

        let scaleX: number ;
        let scaleY: number ;
       if(curItem.dataset.isEnlargement == 'enlargement'){
           switch( Math.abs(rotateDeg % 360) ){
                case 0:
                case 180:
                    scaleX =  Number(curItem.dataset.initialWidth) / curItemWidth;
                    scaleY = Number(curItem.dataset.initialHeight) / curItemHeight;
                    break;
                case 90:
                case 270:
                    scaleX =  Number(curItem.dataset.initialWidth) / curItemHeight;
                    scaleY = Number(curItem.dataset.initialHeight) / curItemWidth;
                    break;
                default:
                    break;
            }
            
       }else{
           switch( Math.abs(rotateDeg % 360) ){
                case 0:
                case 180:
                    scaleX = maxWidth / curItemWidth;
                    scaleY = maxHeight / curItemHeight;
                    break;
                case 90:
                case 270:
                    scaleX = maxWidth / curItemHeight;
                    scaleY = maxHeight / curItemWidth;
                    break;
                default:
                    break;
            }   
            
       } ;
        if( scaleX > 1 ){//放大

            /**
             * transform-origin 的参考点始终时对其初始位置来说的
             */
            
            switch( Math.abs(rotateDeg % 360) ){
                case 0:
                    curItem.style.cssText = `;
                        transform: rotateZ(${rotateDeg}deg) scale3d(${ scaleX },${ scaleY },1);
                        transform-origin: ${ mouseX }px ${ mouseY }px;
                    `;
                    break;
                case 180:
                    curItem.style.cssText = `;
                        transform: rotateZ(${rotateDeg}deg) scale3d(${ scaleX },${ scaleY },1);
                        transform-origin: ${ mouseX }px ${ mouseY }px;
                    `;
                    break;
                case 90:
                    curItem.style.cssText = `;
                        transform: rotateZ(${rotateDeg}deg) scale3d(${ scaleX },${ scaleY },1);
                        transform-origin: ${ curItemViewBottom - mouseY  }px ${ mouseX - curItemViewLeft  }px;
                    `;
                    break;
                case 270:
                    scaleX = maxWidth / curItemHeight;
                    scaleY = maxHeight / curItemWidth;
                    break;
                default:
                    break;
            }   
            
        }else{
            curItem.style.cssText = `;
                                 top:${curItem.dataset.top}px;
                                 left:${curItem.dataset.left}px;
                                 width: ${maxWidth}px;
                                 height: ${maxHeight}px;
                                 transform: rotateZ(${rotateDeg}deg) scale3d(${ scaleX },${ scaleY },1);
                                 transform-origin: ${ mouseX - Number(curItem.dataset.left) }px ${ mouseY - Number(curItem.dataset.top) }px;
                                `;
            curItem.dataset.top = '0';
            curItem.dataset.left = '0';
        }

        
        /**
         * 后续需要用width和height 以及定位实现
         * transform的模拟效果，因为transform不占据文档流
         * 当前放大的元素会与其他元素重叠
         */
        if( scaleX > 1 ){
            curItem.dataset.isEnlargement = 'enlargement';
            // 放大之后 图片相对视口位置不变

            let scaledX: number ;
            let scaledY: number ;
            if( Math.abs(rotateDeg % 360) == 90 || Math.abs(rotateDeg % 360) == 270 ){
                scaledX = mouseX * scaleY;
                scaledY = mouseY * scaleX;
            }else{
               scaledX = mouseX * scaleX;
               scaledY = mouseY * scaleY;
            }

            setTimeout(() => {
                curItem.style.cssText = `;
                                    transform: rotateZ(${rotateDeg}deg);
                                    width: ${ maxWidth }px;
                                    height: ${ maxHeight }px;
                                    left: -${ scaledX - mouseX  }px;
                                    top: -${ scaledY - mouseY  }px;
                                    transition: none;
                                    `;
                curItem.dataset.top = `-${ scaledY - mouseY  }`;
                curItem.dataset.left = `-${ scaledX -mouseX  }`;
                this.isAnimating = false;
            },500)
        }else{
            curItem.dataset.isEnlargement = 'shrink';
            setTimeout(() => {
                curItem.style.cssText = `;
                                    transform: rotateZ(${rotateDeg}deg);
                                    width: ${curItem.dataset.initialWidth}px;
                                    height: ${curItem.dataset.initialHeight}px;
                                    transition: none;
                                    `
                this.isAnimating = false;
            },500)
        }

        
        
        

    }
    handleMove(e: TouchEvent & MouseEvent){
        e.preventDefault();
        clearTimeout( this.performerClick )
        if( this.isAnimating ){
            return;
        } 

        // 双指缩放时的处理
        if( e.touches.length == 2 ){
            
            this.handleZoom( e );
            return;
        }

        const curItem: HTMLElement = this.imgItems[this.curIndex];

        if( curItem.dataset.isEnlargement == 'enlargement' ){
            // 放大的时候的移动是查看放大后的图片
            this.handleMoveEnlage(e);
        }else{
            //正常情况下的移动是图片左右切换
            this.handleMoveNormal(e)
        }
        
        
    }
    handleZoom(e: TouchEvent & MouseEvent ) :void{
        if( !this.isZooming ){
            this.curStartPoint1 = {
                x: this.curPoint1.x,
                y: this.curPoint1.y
            }
            this.curStartPoint2 = {
                x: this.curPoint2.x,
                y: this.curPoint2.y
            }
        }
        this.isZooming = true;
        const curItem: HTMLElement = this.imgItems[this.curIndex];
        const curImg: HTMLImageElement = curItem.querySelector('img');

        const curItemWidth: number = curItem.getBoundingClientRect().width;
        const curItemHeihgt: number = curItem.getBoundingClientRect().height;

        const distaceBefore: number = 
            Math.sqrt( Math.pow( this.curPoint1.x - this.curPoint2.x,2) + Math.pow( this.curPoint1.y - this.curPoint2.y,2) );

        const distanceNow: number = 
            Math.sqrt( Math.pow( e.touches[0].pageX - e.touches[1].pageX,2) + Math.pow( e.touches[0].pageY - e.touches[1].pageY,2) );
        
        let top: number = Number(curItem.dataset.top) || 0;
        let left: number = Number(curItem.dataset.left) || 0;
        
        const centerX: number = ( this.curStartPoint1.x + this.curStartPoint2.x ) / 2 - left;
        const centerY: number = ( this.curStartPoint1.y + this.curStartPoint2.y ) / 2 - top;
        
        this.curPoint1.x = e.touches[0].pageX;
        this.curPoint1.y = e.touches[0].pageY;
        this.curPoint2.x = e.touches[1].pageX;
        this.curPoint2.y = e.touches[1].pageY;
        let stat = document.getElementById('stat');
        stat.innerText = `
            e.touches[0].pageX: ${e.touches[0].pageX}px;
            e.touches[0].clientX: ${e.touches[0].clientX}px;
            this.isZooming: ${this.isZooming}
            curItem.dataset.rotateDeg: ${curItem.dataset.rotateDeg}
        `;

        let rotateDeg: number = Number(curItem.dataset.rotateDeg || '0')

        /**
         * 踩坑记：
         * 因为双指所确定的中心坐标 其参考起点始终是
         * 相对于视口的，那么在图片不断放大之后 其所确定的中心坐标必然会较实际有所误差
         * 所以这里在  放大的时候 同时需要在xy坐标加上其实际已经偏移的距离
         * 因为放大之后偏移值必为负值，所以要减 负负得正嘛
         */
        if( distaceBefore > distanceNow ){//缩小
            const centerX: number = ( this.curStartPoint1.x + this.curStartPoint2.x ) / 2 - left;
            const centerY: number = ( this.curStartPoint1.y + this.curStartPoint2.y ) / 2 - top;
            
            curItem.dataset.top = (top + (this.zoomScale)*centerY ).toString();
            curItem.dataset.left = (left + (this.zoomScale)*centerX ).toString();
            let width: number = curItemWidth * (1 - this.zoomScale);
            let height: number = curItemHeihgt * (1 - this.zoomScale);
            if( width <= Number(curItem.dataset.initialWidth) ){
                width = Number(curItem.dataset.initialWidth);
                height = Number(curItem.dataset.initialHeight)
                curItem.dataset.top = '0';
                curItem.dataset.left = '0';
                curItem.dataset.isEnlargement = 'shrink';
            }
            /**
             * 采坑记：
             * 旋转 90 270 这些体位的时候 ，width和height得交换下位置
             * 下同
             */
            switch( Math.abs(rotateDeg % 360) ){
                case 0:
                case 180:
                    curItem.style.cssText += `
                            width: ${width}px;
                            height: ${height}px;
                            top: ${ curItem.dataset.top }px;
                            left: ${ curItem.dataset.left }px;
                    `
                    break;
                case 90:
                case 270:
                    curItem.style.cssText += `
                            height: ${width}px;
                            width: ${height}px;
                            left: ${ curItem.dataset.top }px;
                            top: ${ curItem.dataset.left }px;
                    `
                    ;
                    break;
                default:
                    break;
            }
            

        }else if( distaceBefore < distanceNow ){//放大
            
            curItem.dataset.isEnlargement = 'enlargement';
            
            curItem.dataset.top = (top - (this.zoomScale)*centerY ).toString();
            curItem.dataset.left = (left - (this.zoomScale)*centerX ).toString();

            switch( Math.abs(rotateDeg % 360) ){
                case 0:
                case 180:
                    curItem.style.cssText += `
                            width: ${curItemWidth*(1+this.zoomScale)}px;
                            height: ${curItemHeihgt*(1+this.zoomScale)}px;
                            top: ${ curItem.dataset.top }px;
                            left: ${ curItem.dataset.left }px;
                    `
                    break;
                case 90:
                case 270:
                    curItem.style.cssText += `
                            height: ${curItemWidth*(1+this.zoomScale)}px;
                            width: ${curItemHeihgt*(1+this.zoomScale)}px;
                            left: ${ curItem.dataset.top }px;
                            top: ${ curItem.dataset.left }px;
                    `
                    ;
                    break;
                default:
                    break;
            }
            
            

        }


    }
    handleToucnEnd(e: TouchEvent & MouseEvent){
        if( this.isAnimating || e.changedTouches.length !== 1  ){//动画正在进行时，或者不是单指操作时一律不处理
            return;
        } 

        if( e.touches.length == 0 ){
            // someOperate;
            this.isZooming = false;
        }

        const curItem: HTMLElement = this.imgItems[this.curIndex];


        if( curItem.dataset.isEnlargement == 'enlargement' ){
            // 放大的时候
            this.handleTEndEnlarge(e);
        }else{
            //正常情况下的
            this.handleTEndEnNormal(e)
        }
       
        
    }
    handleTEndEnlarge ( e: TouchEvent & MouseEvent) : void{
        const curItem: HTMLElement = this.imgItems[this.curIndex];
        const curImg: HTMLImageElement = curItem.querySelector('img');

        const curItemWidth: number = curItem.getBoundingClientRect().width;
        const curItemHeihgt: number = curItem.getBoundingClientRect().height;

        const maxTop: number = 0;
        const maxBottom: number = window.innerHeight - curItemHeihgt;
        const maxLeft: number = 0;
        const MaxRight: number = window.innerWidth - curItemWidth;

        const curItemTop: number  = Number(curItem.dataset.top);
        const curItemLeft: number  = Number(curItem.dataset.left);

        if( curItemTop > maxTop ){
            this.animate( curItem, 'top', curItemTop, 0, -this.step );
            curItem.dataset.top = "0";
        }
    }
    handleTEndEnNormal ( e: TouchEvent & MouseEvent) : void{
        let endX: number = Math.round(e.changedTouches[0].pageX);

        if(  endX - this.touchStartX >= this.threshold ){//前一张
            if( this.curIndex == 0){//第一张
                this.slideSelf();
                return;
            }
            this.curIndex--;
            this.slidePrev();
        }else if( endX - this.touchStartX <= -this.threshold ){//后一张
            if( this.curIndex + 1 == this.imgsNumber ){//最后一张
                this.slideSelf();
                return;
            }
            this.curIndex++;
            this.slideNext();
        }else{//复原
            this.slideSelf();
        }
    }
    slideNext(){
        let endX = -(this.curIndex * this.screenWidth);
        if( endX < -(this.screenWidth * this.imgsNumber - 1) ){
            endX = -(this.screenWidth * this.imgsNumber - 1);
            this.curIndex = this.imgsNumber -1 ;
        }
        this.animate( this.imgContainer, 'transform',this.imgContainerMoveX, endX, -this.step )
    }
    slidePrev(){
        let endX = -(this.curIndex * this.screenWidth);
        if( endX > 0 ){
            endX = 0;
            this.curIndex = 0;
        }
        this.animate( this.imgContainer, 'transform',this.imgContainerMoveX, endX, this.step )
    }
    slideSelf(){
 
        let endX = -(this.curIndex * this.screenWidth);
        if( endX < this.imgContainerMoveX ){
            this.animate( this.imgContainer, 'transform',this.imgContainerMoveX, endX, -this.step )
        }else{
            this.animate( this.imgContainer, 'transform',this.imgContainerMoveX, endX, this.step )
        }
        
    }
    handleMoveNormal( e: TouchEvent & MouseEvent ){
        let curX: number = Math.round(e.touches[0].pageX);

        let offset = curX - this.startX;
        this.imgContainerMoveX += offset;
        if( this.imgContainerMoveX > this.maxMoveX  ){
            this.imgContainerMoveX = this.maxMoveX;
        }else if( this.imgContainerMoveX < this.minMoveX ){
            this.imgContainerMoveX = this.minMoveX;
        }
        this.startX = curX;

        this.imgContainer.style.transform = `translateX(${ this.imgContainerMoveX }px)`
    }
    handleMoveEnlage( e: TouchEvent & MouseEvent ){
        
        const curItem: HTMLElement = this.imgItems[this.curIndex];
        const curImg: HTMLImageElement = curItem.querySelector('img');

        const curItemWidth: number = curItem.getBoundingClientRect().width;
        const curItemHeihgt: number = curItem.getBoundingClientRect().height;

        let curX: number = Math.round(e.touches[0].pageX);
        let curY: number = Math.round(e.touches[0].pageY);

        let offsetX: number  = curX - this.startX;
        let offsetY: number  = curY - this.startY;

        const curItemTop: number  = Number(curItem.dataset.top);
        const curItemLeft: number  = Number(curItem.dataset.left);

        

        let curTop: number = curItemTop + offsetY;

        curItem.style.cssText += `
            top: ${curTop}px;
            left: ${ curItemLeft + offsetX }px;
        `
        curItem.dataset.top = (curTop).toString();
        curItem.dataset.left = (curItemLeft + offsetX).toString();
        this.startX = curX;
        this.startY = curY;

        

    }
    animate(
        el: HTMLElement,
        prop: string,
        start: number,
        end: number,
        step: number
    ){
        if( this.isAnimating ){
            return;
        } 
        this.isAnimating = true;
        if( Math.abs(end - start) < Math.abs(step) ){
            step = end - start;
        }
        function processStyle(){
            switch( prop ){
                case 'transform':
                        el.style.transform = `translateX( ${start + step}px )`;;
                        break;
                case 'top':
                    el.style.top = `${start + step}px`;
                    break;
                default:
                    break;
            }
        }
        
        processStyle();
        start += step;
        
        let move = () => {
            if( Math.abs(end - start) < Math.abs(step) ){
                step = end - start;
            }
            processStyle();
            start += step;
            if( start !== end ){
                requestAnimationFrame(move)
            }else{
                this.imgContainerMoveX = end;
                this.isAnimating = false;
            }
        }

        this.handleReausetAnimate();//requestAnimationFrame兼容性

        if( start !== end ){
                requestAnimationFrame(move)
        }else{
            this.imgContainerMoveX = end;
            this.isAnimating = false;
        }

        

    }
    genFrame(){
        let html : string = `
            <div class="${this.prefix}imagePreviewer">
                <div class="${this.prefix}close">
                    <svg t="1563161688682" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="5430"><path d="M10.750656 1013.12136c-13.822272-13.822272-13.822272-36.347457 0-50.169729l952.200975-952.200975c13.822272-13.822272 36.347457-13.822272 50.169729 0 13.822272 13.822272 13.822272 36.347457 0 50.169729l-952.200975 952.200975c-14.334208 14.334208-36.347457 14.334208-50.169729 0z" fill="#ffffff" p-id="5431"></path><path d="M10.750656 10.750656c13.822272-13.822272 36.347457-13.822272 50.169729 0L1013.633296 963.463567c13.822272 13.822272 13.822272 36.347457 0 50.169729-13.822272 13.822272-36.347457 13.822272-50.169729 0L10.750656 60.920385c-14.334208-14.334208-14.334208-36.347457 0-50.169729z" fill="#ffffff" p-id="5432"></path></svg>
                </div>
                <div class="${this.prefix}imgContainer">
                    <div class="${this.prefix}item" id="test">
                        <img src="/testImage/main_body3.png">
                    </div>
                    <div class="${this.prefix}item">
                        <img src="/testImage/main_body3.png">
                    </div>
                    <div class="${this.prefix}item">
                        <img src="/testImage/main_body3.png">
                    </div>
                    <div class="${this.prefix}item">
                        <img src="/testImage/more20190627.png">
                    </div>
                </div>
                <div class="${this.prefix}bottom">
                    <div class="${this.prefix}item ">
                        <svg data-type="rotateLeft" t="1563884004339" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1099" width="200" height="200"><path d="M520.533333 285.866667c140.8 12.8 251.733333 132.266667 251.733334 277.333333 0 153.6-123.733333 277.333333-277.333334 277.333333-98.133333 0-192-55.466667-238.933333-140.8-4.266667-8.533333-4.266667-21.333333 8.533333-29.866666 8.533333-4.266667 21.333333-4.266667 29.866667 8.533333 42.666667 72.533333 119.466667 119.466667 204.8 119.466667 128 0 234.666667-106.666667 234.666667-234.666667s-98.133333-230.4-226.133334-234.666667l64 102.4c4.266667 8.533333 4.266667 21.333333-8.533333 29.866667-8.533333 4.266667-21.333333 4.266667-29.866667-8.533333l-89.6-145.066667c-4.266667-8.533333-4.266667-21.333333 8.533334-29.866667L597.333333 187.733333c8.533333-4.266667 21.333333-4.266667 29.866667 8.533334 4.266667 8.533333 4.266667 21.333333-8.533333 29.866666l-98.133334 59.733334z" p-id="1100" fill="#ffffff"></path></svg>
                    </div>
                    <div class="${this.prefix}item">
                        <svg data-type="rotateRight" t="1563884064737" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1251" width="200" height="200"><path d="M503.466667 285.866667L405.333333 226.133333c-8.533333-8.533333-12.8-21.333333-8.533333-29.866666 8.533333-8.533333 21.333333-12.8 29.866667-8.533334l145.066666 89.6c8.533333 4.266667 12.8 17.066667 8.533334 29.866667l-89.6 145.066667c-4.266667 8.533333-17.066667 12.8-29.866667 8.533333-8.533333-4.266667-12.8-17.066667-8.533333-29.866667l64-102.4c-123.733333 4.266667-226.133333 106.666667-226.133334 234.666667s106.666667 234.666667 234.666667 234.666667c85.333333 0 162.133333-46.933333 204.8-119.466667 4.266667-8.533333 17.066667-12.8 29.866667-8.533333 8.533333 4.266667 12.8 17.066667 8.533333 29.866666-51.2 85.333333-140.8 140.8-238.933333 140.8-153.6 0-277.333333-123.733333-277.333334-277.333333 0-145.066667 110.933333-264.533333 251.733334-277.333333z" p-id="1252" fill="#ffffff"></path></svg>
                    </div>
                </div>
            </div>
        `;
        let style: string =`
            .${this.prefix}imagePreviewer{
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,1);
                color:#fff;
                transform: translate3d(0,0,0);
            }
            .${this.prefix}imagePreviewer .${this.prefix}close{
                position: absolute;
                top:20px;
                right:20px;
                width: 22px;
                height: 22px;
                background: #000;
            }
            .${this.prefix}imagePreviewer .${this.prefix}close svg{
                width: 100%;
                height: 100%;
            }
            .${this.prefix}imagePreviewer ${this.prefix}.close.${this.prefix}scroll{
                height: 0;
            }
            .${this.prefix}imagePreviewer .${this.prefix}imgContainer{
                position: relative;
                height: 100%;
                font-size: 0;
                white-space: nowrap;
            }
            .${this.prefix}imagePreviewer .${this.prefix}imgContainer .${this.prefix}item{
                position: relative;
                display:inline-block;
                width: 100%;
                height: auto;
                font-size: 14px;
                white-space: normal;
                transition: transform 0.5s;
            }
            .${this.prefix}imagePreviewer .${this.prefix}item img{
                width: 100%;
                height: auto;
            }
            .${this.prefix}imagePreviewer .${this.prefix}bottom{
                position: absolute;
                bottom: 0;
                left: 20px;
                right: 20px;
                padding:10px;
                text-align: center;
                border-top: 1px solid rgba(255, 255, 255, .2);
            }
            .${this.prefix}imagePreviewer .${this.prefix}bottom .${this.prefix}item{
                display:inline-block;
                width: 20px;
                height: 20px;
                margin-right: 10px;
                cursor:pointer;
            }
            .${this.prefix}imagePreviewer .${this.prefix}bottom .${this.prefix}item svg{
                width: 100%;
                height: 100%;
            }
        `;
        this.ref = document.createElement('div');
        this.ref.innerHTML = html;

        let styleElem = document.createElement('style');
        styleElem.innerHTML = style;

        document.querySelector('head').appendChild(styleElem);
        document.body.appendChild( this.ref )
    }
    handleReausetAnimate(){
        if(!window['requestAnimationFrame']){
            window['requestAnimationFrame'] = (function(){
            return  window['webkitRequestAnimationFrame'] ||
                    function( callback: Function ){
                        window.setTimeout(callback, 1000 / 60);
                        return 0;
                    };
            })();
        }
        
    }
}