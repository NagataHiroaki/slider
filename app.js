const createTag = (tagName, opt) => {
  let tag = document.createElement(tagName);
  if (opt.class) tag.className = opt.class;
  if (opt.href) tag.href = opt.href;
  return tag;
};

const pagerDom = () => {
  let container = createTag("div", {
    class: "slider-controller"
  });

  let next = createTag("a", {
    class: "next",
    href: "javascript:void(0);"
  });

  let prev = createTag("a", {
    class: "prev",
    href: "javascript:void(0);"
  });

  container.appendChild(prev);
  container.appendChild(next);
  return container;
};

const indicatorDom = length => {
  let container = document.createElement("div");
  container.className = "slider-dots";

  for (let i = 0; i < length; i++) {
    let a = document.createElement("a");
    a.href = "javascript:void(0)";
    container.appendChild(a);
  }

  return container;
};

/**
 * 登録されているリスナーをディスパッチする.
 */
class EventDispatcher {
  /**
   * コンストラクタ.
   */
  constructor() {
    this._listeners = [];
  }
  /**
   * イベントリスナーを登録する.
   * @param {String} type 登録しているイベントのタイプ
   * @param {Function} fn イベントの発生時に呼び出されるメソッド
   */
  addEventListener(type, fn) {
    if (this.hasEventListener(type)) {
      return;
    }
    this._listeners.push({
      type: type,
      fn: fn
    });
    console.log(this._listeners);
  }
  /**
   * 登録されているイベントをイベントをディスパッチする.
   * @param {Object} e イベントオブジェクト
   */
  dispatch(e) {
    console.log(e.type);
    console.log(this._listeners);
    for (var i = 0; i < this._listeners.length; i++) {
      let ls = this._listeners[i];
      if (ls.type == e.type) {
        ls.fn.call(this, e.args);
      }
    }
  }
  /**
   * 指定のイベントのタイプのリスナーが登録されているか返却する.
   * @param {String} type 登録しているイベントのタイプ
   * @return {Boolean} 指定のイベントのタイプのリスナーが登録されている場合は true
   */
  hasEventListener(type) {
    for (var i = 0; i < this._listeners.length; i++) {
      let ls = this._listeners[i];
      if (ls.type == type) {
        return true;
      }
    }
    return false;
  }
  /**
   * イベントリスナーを削除する.
   * @param {String} type 登録しているイベントのタイプ
   * @param {Function} fn イベントの発生時に呼び出されるメソッド
   */
  removeEventListener(type, fn) {
    for (var i = 0; i < this._listeners.length; i++) {
      if (ls.type != type || ls.fn != fn) {
        this._listeners.splice(i, 1);
        break;
      }
    }
  }
}

/**
 * ViewModel
 */
const sliderEvent = {
  onClickNext: "sliderEvent_onClickNext",
  onClickPrev: "sliderEvent_onClickPrev",
  onClickIndicator: "sliderEvent_onClickIndicator"
};

class SliderView extends EventDispatcher {
  constructor(obj) {
    super();
    this.area = document.querySelector(obj.area);
    this.slideContent = document.querySelector(obj.view); // 実際に動くエリアの要素
    this.slideChild = document.querySelectorAll(obj.item); // スライドする1枚の要素

    this.hasIndicator = obj.hasIndicator;
    this.hasPager = obj.hasPager;

    this.firstSrc = obj.firstSrc;

    this.currentIndex = 0; // 何番目を表示しているか
    this.nextIndex = 0; // 次のスライドのインデックス
    this.slideLength = this.slideChild.length; // スライドの枚数

    this.childWidth = 0; // スライド1枚の幅
    this.contentWidth = 0; // スライドエリアの幅
    this.nextPosition = 0; // 移動先の位置
    this.diffWidth = 0; // 描画エリアを真ん中にするための調整用幅

    this.easing = obj.easing ? obj.easing : "ease";
    this.duration = obj.duration | 600;
    this.delay = obj.delay | 0;
    this.cssTransition;

    this.pager;
    this.indicator;

    this.isReset = false;

    this.moving = false;
  }
  /**
   * それぞれのイベントの発火を検知し、イベントを付与する
   */
  init() {
    const imgList = this.area.getElementsByTagName("img");

    if (imgList.length > 0) {
      const img = new Image();
      img.src = imgList[0].src;
      img.onload = () => {
        this.load();
      };
    } else {
      load();
    }
    // 次へをクリック
    // 前へをクリック
    // インジケーターをクリック
  }

  load() {
    this.getChildWidth();
    this.setContentWidth();

    for (let item of this.slideChild) {
      item.style.width = this.childWidth + "px";
    }

    // console.log(this.slideContent);
    this.slideContent.style.width = this.contentWidth + "px";
    // スライドの枚数を取得する
    // console.log(this.slideLength);
    

    // Indicatorを描画する
    if (this.hasIndicator) {
      this.area.appendChild(indicatorDom(this.slideLength));
      this.indicator = new Indicator();
      this.indicator.init();

      this.indicator.addEventListener(sliderEvent.onClickIndicator, args => {
        if(this.moving) return;
        this.getNextIndex(args[0]);
        this.calcNextPosition();
        this.indicator.setCurrentStyle(this.nextIndex);
        this.moveTo();
      });
    }

    // ページャーを描画する
    if (this.hasPager) {
      this.area.appendChild(pagerDom());
      this.pager = new Pager();
      this.pager.init();

      this.pager.addEventListener(sliderEvent.onClickNext, () => {
        if(this.moving) return;
        // console.log("次へをクリック");
        this.getNextIndex("next");
        this.calcNextPosition();
        this.moveTo();
        this.indicator.setCurrentStyle(this.nextIndex);

        if (this.isReset) {
          setTimeout(() => {
            console.log("wait");
            this.resetIndex();
            this.calcNextPosition();
            this.slideContent.style.transition = "none";
            this.slideContent.style.transform =
              "translateX(" + this.nextPosition + "px)";
            this.indicator.setCurrentStyle(this.nextIndex);
          }, this.duration);
        }
      });

      this.pager.addEventListener(sliderEvent.onClickPrev, () => {
        if(this.moving) return;
        // console.log("前へをクリック");
        this.getNextIndex("prev");
        this.calcNextPosition();
        this.moveTo();
        this.indicator.setCurrentStyle(this.nextIndex);

        if (this.isReset) {
          setTimeout(() => {
            console.log("wait");
            this.resetIndex();
            this.calcNextPosition();

            this.slideContent.style.transition = "none";
            this.slideContent.style.transform =
              "translateX(" + this.nextPosition + "px)";
            this.indicator.setCurrentStyle(this.nextIndex);
          }, this.duration);
        }
      });
    }

    this.cloneFirstAndLast();
    
    this.resetIndex();
    this.calcNextPosition();
    this.slideContent.style.transition = "none";
    this.slideContent.style.transform =
      "translateX(" + this.nextPosition + "px)";
    this.indicator.setCurrentStyle(this.nextIndex);
  }

  cloneFirstAndLast() {
    const first = this.slideChild[0];
    const clone1 = this.slideChild[0].cloneNode(true);
    const clone2 = this.slideChild[1].cloneNode(true);

    const clone3 = this.slideChild[this.slideLength - 2].cloneNode(true);
    const clone4 = this.slideChild[this.slideLength - 1].cloneNode(true);
    const container = this.slideChild[0].parentNode;
    container.appendChild(clone1);
    container.appendChild(clone2);
    container.insertBefore(clone3, first);
    container.insertBefore(clone4, first);
  }

  /**
   * i番目のスライドに移動する
   * @param {Number} i
   * @param {String} direction
   */
  changeSlide(i) {
    if (this.currentIndex === 0 && this.nextIndex < this.currentIndex) {
      // 最初のスライドにいて、さらに前のスライドへ移動しようとしたら、
      // 最後のスライドに移動する
    }

    if (
      this.currentIndex === this.slideLength &&
      this.currentIndex < this.nextIndex
    ) {
      // 最後のスライドにいて、さらに次のスライドへ移動しようとしたら、
      // 最初のスライドに移動する
    }
  }

  moveTo() {
    this.moving = true;
    // console.log(this.nextPosition + "px");
    // console.log(this.cssTransition);
    // console.log(this.slideContent.style);
    this.slideContent.style.transform = "translateX(" + this.nextPosition + "px)";
    this.slideContent.style.transition = this.cssTransition;
    setTimeout(() => {
      this.moving = false;
    }, this.duration);
    // console.log(this.slideContent.style.transition);
  }
}

/**
 * Controller
 */
class Slider extends SliderView {
  constructor(obj) {
    super(obj);
  }

  init() {
    super.init();
    this.setTransition();
  }

  /**
   * スライドのインデックスを再設定する処理
   */
  resetIndex() {
    this.isReset = false;
    // 最後のスライドの場合は先頭に移動する
    if (this.nextIndex >= this.slideLength) {
      this.nextIndex = 0;
    }

    // 先頭のスライドの場合は最後に移動する
    if (this.nextIndex < 0) {
      this.nextIndex = this.slideLength - 1;
    }
  }

  /**
   * 次のスライドのインデックスを設定する
   * @param {Number,String} direction
   */
  getNextIndex(direction) {
    if (direction === "next") {
      this.nextIndex++;
    }

    if (direction === "prev") {
      this.nextIndex--;
    }
    // 数字の場合はそのまま反映する
    if (typeof direction === "number") {
      this.nextIndex = direction;
    }

    if (this.nextIndex >= this.slideLength || this.nextIndex < 0) {
      this.isReset = true;
    }
  }

  /**
   * スライド1枚の幅を取得する
   */
  getChildWidth() {
    this.childWidth = this.slideChild[0].clientWidth;
  }

  /**
   * スライドエリアの幅を設定する
   */
  setContentWidth() {
    this.contentWidth = this.childWidth * (this.slideLength + 4);
  }

  /**
   * 移動先のスライドの位置を設定する
   */
  calcNextPosition() {
    this.diffWidth = (this.area.clientWidth - this.childWidth) / 2;
    this.nextPosition = -(this.childWidth * 2) - this.nextIndex * this.childWidth + this.diffWidth;
    // console.log(this.nextPosition);
    // this.nextPosition -= (window.innerWidth - this.childWidth) / 2;
    // console.log(this.nextPosition);
  }

  /**
   * トランジションを設定する
   */
  setTransition() {
    this.cssTransition = "transform " + this.duration + "ms " + this.easing;
  }
}

class Pager extends EventDispatcher {
  constructor() {
    super();
    this.next = document.querySelector(".next");
    this.prev = document.querySelector(".prev");
  }
  init() {
    this.next.addEventListener("click", e => {
      this.dispatch({
        type: sliderEvent.onClickNext
      });
    });
    this.prev.addEventListener("click", e => {
      this.dispatch({
        type: sliderEvent.onClickPrev
      });
    });
  }
}

class Indicator extends EventDispatcher {
  constructor() {
    super();
    this.container = document.querySelector(".slider-dots");
    this.item = this.container.getElementsByTagName("a");
  }

  init() {
    for (let i = 0; i < this.item.length; i++) {
      this.item[i].addEventListener("click", e => {
        const elements = [].slice.call(this.item);
        const index = elements.indexOf(e.target);
        // console.log(index + "番目をクリックしました");


        this.dispatch({
          type: sliderEvent.onClickIndicator,
          args: [index]
        });
      });
    }
  }

  setCurrentStyle(index) {
    for (let i = 0; i < this.item.length; i++) {
      const item = this.item[i];
      if (i === index) {
        item.classList.add("current");
      } else {
        item.classList.remove("current");
      }
    }
  }
}

const slider = new Slider({
  area: ".slider-content",
  view: ".slider-view",
  item: ".slider-item",
  firstSrc: "./img/01.jpg",
  hasIndicator: true,
  hasPager: true,
  easing: "ease",
  duration: 600,
  delay: 0
});

slider.init();
