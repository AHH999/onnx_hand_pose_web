/*
 * @Author: aaa@163.com
 * @Date: 2025-05-28 09:19:04
 * @LastEditors: aaa@163.com
 * @LastEditTime: 2025-05-29 17:31:55
 * @FilePath: \onnx_hand_pose_web\js\main.js
 * @Description: 
 */
const SIZE = 320
class CreateMeadiaStream {
    static textDecoder = new TextDecoder('utf-8');
    static #stream;
    static videoDom = null;
    static #imageCapture
    static getVideoDom() {
        if (!this.videoDom) {
            this.videoDom = document.getElementById("video")
        }
        return this.videoDom
    }
    static async mediaInit() {
        try {
            this.#stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    width: { min: SIZE, ideal: SIZE, max: SIZE },
                    height: { min: SIZE, ideal: SIZE, max: SIZE }
                }
            });
            this.getVideoDom().srcObject = this.#stream
            // const track = this.#stream.getVideoTracks()[0];
            // this.#imageCapture = new ImageCapture(track);

            this.setVideoStreamForCanvas()
            return;

        } catch (e) {
            const msg = e.message;
            switch (msg) {
                case "Requested device not found":
                    alert("未发现输入设备")
                    return;
                default:
                    alert("未知错误" + msg)
            }
            return;
        }
    }
    static async setVideoStreamForCanvas() {
        try {
            // const bitmap = await CreateMeadiaStream.#imageCapture.grabFrame();
            // console.log(bitmap)
            // await Model.run_model(bitmap)
            Model.run_model(CreateMeadiaStream.getVideoDom())
            // bitmap.close()
        } catch (error) {
            console.error('Error grabbing frame:', error);
        }
        // setTimeout(CreateMeadiaStream.#setVideoStreamForCanvas, 100)
    }
}
class Model {
    static gesturesClassify = [
        { key: 'grabbing', name: '抓取' },
        { key: 'grip', name: '紧握' },
        { key: 'holy', name: '祈祷手势（宗教手势）' },
        { key: 'point', name: '单指指向' },
        { key: 'call', name: '打电话手势' },
        { key: 'three3', name: '数字三（手势变体）' },
        { key: 'timeout', name: '暂停/超时手势' },
        { key: 'xsign', name: 'X形手势' },
        { key: 'hand_heart', name: '爱心手势（单手）' },
        { key: 'hand_heart2', name: '爱心手势（双手）' },
        { key: 'little_finger', name: '小拇指手势' },
        { key: 'middle_finger', name: '竖中指（侮辱手势）' },
        { key: 'take_picture', name: '拍照手势' },
        { key: 'dislike', name: '差评手势' },
        { key: 'fist', name: '握拳' },
        { key: 'four', name: '数字四' },
        { key: 'like', name: '点赞手势' },
        { key: 'mute', name: '静音手势' },
        { key: 'ok', name: 'OK手势' },
        { key: 'one', name: '数字一' },
        { key: 'palm', name: '手掌平摊' },
        { key: 'peace', name: '和平手势（胜利手势）' },
        { key: 'peace_inverted', name: '倒置和平手势' },
        { key: 'rock', name: '摇滚手势' },
        { key: 'stop', name: '停止手势' },
        { key: 'stop_inverted', name: '倒置停止手势' },
        { key: 'three', name: '数字三' },
        { key: 'three2', name: '数字三（手势变体2）' },
        { key: 'two_up', name: '双指上指' },
        { key: 'two_up_inverted', name: '倒置双指上指' },
        { key: 'three_gun', name: '手枪手势（三指模拟）' },
        { key: 'thumb_index', name: '拇指食指相触' },
        { key: 'thumb_index2', name: '拇指食指相触（变体）' },
        { key: 'no_gesture', name: '无手势' }
    ];
    static #model;
    static #inputName;
    static #outputName;
    static #modelProcessingWorker;
    static #modelLoaded = false
    static #ctx;
    static #offCanvas
    static #offCtx;
    static async init() {
        this.#ctx = document.getElementById("amplify-canvas").getContext('2d')
        this.#offCanvas = new OffscreenCanvas(SIZE, SIZE)
        this.#offCtx = this.#offCanvas.getContext("2d");
        this.#modelProcessingWorker = new Worker("../worker/modelProcessing.js")
        this.#modelProcessingWorker.addEventListener("message", this.workerMessage.bind(this))
        this.#modelProcessingWorker.postMessage({ type: "initModel" })
    }
    static workerMessage(e) {
        if (e.data.type === "modelLoaded") {
            if (e.data.success) {
                this.#modelLoaded = true
                setTimeout(()=>{document.getElementById("loading").remove()},500)
                return CreateMeadiaStream.mediaInit();
            } else {
                alert(e.data.errMsg)
            }
        }
        //处理模型返回的结果
        if (e.data.type === "modelResult") {
            const result = e.data.result;
            if (Array.isArray && result.length === 6) {
                this.drawBoxes(Model.#offCtx, result.splice(0, 4), result[0], result[1], SIZE, SIZE)
            }
            Model.#ctx.drawImage(Model.#offCanvas.transferToImageBitmap(), 0, 0, 640, 640)
            CreateMeadiaStream.setVideoStreamForCanvas()
            // console.log(e.data.result)
        }
    }
    static drawBoxes(ctx, boxes, scores, classes, imgWidth, imgHeight, threshold = 0.5) {
        const [x1, y1, x2, y2] = [
            boxes[0],
            boxes[1],
            boxes[2],
            boxes[3]
        ];

        // 绘制方框
        ctx.strokeStyle = "red";
        ctx.lineWidth = 5;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        const label = `Class ${Model.gesturesClassify[classes].name} (${scores.toFixed(2)})`;
        ctx.font = '20px Arial';
        ctx.fillStyle = 'white';
        ctx.fillText(label, x1 + 5, y1 - 5);
        ctx.fillText( `Class ${Model.gesturesClassify[classes].key}`, x1 + 5, y1 - 30);
    }
    static run_model(videoDom) {
        Model.#offCtx.clearRect(0, 0, SIZE, SIZE);
        Model.#offCtx.drawImage(videoDom, 0, 0);
        let data = Model.#offCtx.getImageData(0, 0, SIZE, SIZE).data;
        try {
            this.#modelProcessingWorker.postMessage({ type: "inputData", input: data, size: SIZE })
            data = null;
        } catch (error) {
            console.log(error)
            // alert(error)
        } finally {

        }
    }
}



