document.addEventListener('DOMContentLoaded', () => {
    // DOM 元素
    const fileInput = document.getElementById('fileInput');
    const dropZone = document.getElementById('dropZone');
    const previewSection = document.getElementById('previewSection');
    const originalImage = document.getElementById('originalImage');
    const compressedImage = document.getElementById('compressedImage');
    const originalSize = document.getElementById('originalSize');
    const compressedSize = document.getElementById('compressedSize');
    const quality = document.getElementById('quality');
    const qualityValue = document.getElementById('qualityValue');
    const downloadBtn = document.getElementById('downloadBtn');
    const cropBtn = document.getElementById('cropBtn');
    const cropControls = document.getElementById('cropControls');
    const applyCrop = document.getElementById('applyCrop');
    const cancelCrop = document.getElementById('cancelCrop');
    const undoCropBtn = document.getElementById('undoCropBtn');
    const rotateLeft = document.getElementById('rotateLeft');
    const rotateRight = document.getElementById('rotateRight');
    const filterControls = document.createElement('div');
    filterControls.className = 'filter-controls';
    filterControls.innerHTML = `
        <select id="filterSelect" class="control-select">
            <option value="none">无滤镜</option>
            <option value="grayscale">黑白</option>
            <option value="sepia">复古</option>
            <option value="blur">模糊</option>
            <option value="brightness">明亮</option>
            <option value="contrast">对比度</option>
            <option value="hue-rotate">色相旋转</option>
            <option value="invert">反色</option>
        </select>
    `;

    // 状态变量
    let currentFile = null;
    let originalImageUrl = null;
    let originalFile = null;
    let isFirstClick = false;
    let cropStart = null;
    let cropEnd = null;
    let isCropping = false;
    let cropArea = null;
    let cropOverlay = null;
    let preCropState = null;  // 存储裁剪前的状态
    let currentRotation = 0;
    let currentFilter = 'none';  // 跟踪当前滤镜状态

    // 处理文件上传区域的点击
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    // 处理拖拽事件
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--primary-color)';
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#E5E5E5';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#E5E5E5';
        
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleFile(file);
        } else {
            alert('请选择图片文件！');
        }
    });

    // 处理文件选择
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFile(file);
        }
    });

    // 处理文件函数
    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('请选择图片文件！');
            return;
        }

        // 保存原始文件
        originalFile = file;
        currentFile = file;

        // 创建预览
        const reader = new FileReader();
        reader.onload = (e) => {
            originalImageUrl = e.target.result;
            originalImage.src = e.target.result;
            compressedImage.src = e.target.result;
            originalSize.textContent = formatFileSize(file.size);
            compressedSize.textContent = formatFileSize(file.size);
            
            // 显示预览区域
            previewSection.hidden = false;
        };
        reader.readAsDataURL(file);
    }

    // 格式化文件大小
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 质量滑块变化时更新显示
    quality.addEventListener('input', () => {
        qualityValue.textContent = quality.value + '%';
        if (currentFile) {
            compressImage(currentFile, quality.value / 100);
        }
    });

    // 压缩图片
    function compressImage(file, qualityValue) {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = img.width;
            canvas.height = img.height;
            
            ctx.drawImage(img, 0, 0);
            
            canvas.toBlob((blob) => {
                compressedImage.src = URL.createObjectURL(blob);
                compressedSize.textContent = formatFileSize(blob.size);
                currentFile = new File([blob], file.name, { type: file.type });
            }, file.type, qualityValue);
        };
        img.src = URL.createObjectURL(file);
    }

    // 下载按钮点击事件
    downloadBtn.addEventListener('click', () => {
        if (!currentFile) {
            alert('请先上传图片！');
            return;
        }
        
        const link = document.createElement('a');
        link.href = compressedImage.src;
        link.download = 'compressed_' + currentFile.name;
        link.click();
    });

    // 添加裁剪相关的事件处理
    cropBtn.addEventListener('click', () => {
        if (!currentFile) {
            alert('请先上传图片！');
            return;
        }
        
        isCropping = true;
        isFirstClick = false;
        
        // 显示裁剪控制按钮
        cropControls.hidden = false;
        
        // 创建裁剪遮罩
        const imageContainer = compressedImage.parentElement;
        cropOverlay = document.createElement('div');
        cropOverlay.className = 'crop-overlay';
        cropOverlay.style.width = compressedImage.width + 'px';
        cropOverlay.style.height = compressedImage.height + 'px';
        
        // 添加提示文字
        const hint = document.createElement('div');
        hint.className = 'crop-hint';
        hint.textContent = '点击选择裁剪区域起点';
        cropOverlay.appendChild(hint);
        
        imageContainer.appendChild(cropOverlay);
        
        // 处理裁剪区域选择
        cropOverlay.addEventListener('click', handleCropClick);
    });

    // 处理裁剪点击
    function handleCropClick(e) {
        const rect = cropOverlay.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (!isFirstClick) {
            // 第一次点击，设置起始点
            cropStart = { x, y };
            isFirstClick = true;
            cropOverlay.querySelector('.crop-hint').textContent = '点击选择裁剪区域终点';
            
            // 添加鼠标移动监听
            cropOverlay.addEventListener('mousemove', handleMouseMove);
        } else {
            // 第二次点击，设置结束点并创建裁剪区域
            cropEnd = { x, y };
            createCropArea();
            cropOverlay.querySelector('.crop-hint').textContent = '点击确认裁剪按钮完成裁剪';
            
            // 移除鼠标移动监听
            cropOverlay.removeEventListener('mousemove', handleMouseMove);
        }
    }

    // 添加鼠标移动处理函数
    function handleMouseMove(e) {
        const rect = cropOverlay.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // 更新结束点并显示预览区域
        cropEnd = { x, y };
        createCropArea();
    }

    // 创建裁剪区域
    function createCropArea() {
        if (cropArea) cropArea.remove();
        
        cropArea = document.createElement('div');
        cropArea.className = 'crop-area';
        
        const left = Math.min(cropStart.x, cropEnd.x);
        const top = Math.min(cropStart.y, cropEnd.y);
        const width = Math.abs(cropEnd.x - cropStart.x);
        const height = Math.abs(cropEnd.y - cropStart.y);
        
        cropArea.style.left = left + 'px';
        cropArea.style.top = top + 'px';
        cropArea.style.width = width + 'px';
        cropArea.style.height = height + 'px';
        
        cropOverlay.appendChild(cropArea);
    }

    // 确认裁剪
    applyCrop.addEventListener('click', () => {
        if (!cropArea) {
            alert('请先选择裁剪区域！');
            return;
        }
        
        // 保存裁剪前的状态
        preCropState = {
            imageUrl: compressedImage.src,
            file: currentFile,
            size: compressedSize.textContent
        };
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 获取裁剪区域的位置和尺寸
        const left = parseInt(cropArea.style.left);
        const top = parseInt(cropArea.style.top);
        const width = parseInt(cropArea.style.width);
        const height = parseInt(cropArea.style.height);
        
        // 设置画布大小为裁剪区域的大小
        canvas.width = width;
        canvas.height = height;
        
        // 创建临时图片对象
        const img = new Image();
        img.onload = () => {
            // 计算图片的实际缩放比例
            const scaleX = img.naturalWidth / compressedImage.width;
            const scaleY = img.naturalHeight / compressedImage.height;
            
            // 使用缩放后的坐标进行裁剪
            ctx.drawImage(
                img,
                left * scaleX,    // 源图像的 x 坐标
                top * scaleY,     // 源图像的 y 坐标
                width * scaleX,   // 源图像的宽度
                height * scaleY,  // 源图像的高度
                0,                // 目标画布的 x 坐标
                0,                // 目标画布的 y 坐标
                width,            // 目标画布的宽度
                height           // 目标画布��高度
            );
            
            // 将裁剪后的图像转换为 blob
            canvas.toBlob((blob) => {
                compressedImage.src = URL.createObjectURL(blob);
                currentFile = new File([blob], currentFile.name, { type: currentFile.type });
                compressedSize.textContent = formatFileSize(blob.size);
                cleanupCrop();
            }, currentFile.type);
        };
        img.src = compressedImage.src;
    });

    // 添加撤回功能
    undoCropBtn.addEventListener('click', () => {
        if (!preCropState) {
            alert('没有可撤回的裁剪操作！');
            return;
        }
        
        if (confirm('确定要撤回到裁剪的状态吗？')) {
            compressedImage.src = preCropState.imageUrl;
            currentFile = preCropState.file;
            compressedSize.textContent = preCropState.size;
            preCropState = null;  // 清除保存的状态
        }
    });

    // 取消裁剪
    cancelCrop.addEventListener('click', cleanupCrop);

    // 清理裁剪相关元素
    function cleanupCrop() {
        if (cropOverlay) cropOverlay.remove();
        if (cropArea) cropArea.remove();
        cropControls.hidden = true;
        isCropping = false;
        isFirstClick = false;
        cropStart = null;
        cropEnd = null;
    }

    // 添加旋转事件处理
    rotateLeft.addEventListener('click', () => {
        if (!currentFile) {
            alert('请先上传图片！');
            return;
        }
        // 逆时针旋转（向左）
        currentRotation = (currentRotation - 90 + 360) % 360;  // 确保角度为正
        rotateImage();
    });

    rotateRight.addEventListener('click', () => {
        if (!currentFile) {
            alert('请先上传图片！');
            return;
        }
        // 顺时针旋转（向右）
        currentRotation = (currentRotation + 90) % 360;
        rotateImage();
    });

    // 修改旋转图片函数
    function rotateImage() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            // 根据旋转角度调整画布尺寸
            if (currentRotation % 180 === 0) {
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
            } else {
                canvas.width = img.naturalHeight;
                canvas.height = img.naturalWidth;
            }
            
            // 移动到画布中心
            ctx.translate(canvas.width / 2, canvas.height / 2);
            
            // 旋转（注意 Canvas 中正角度是顺时针方向）
            ctx.rotate((currentRotation * Math.PI) / 180);
            
            // 绘制图片，注意偏移量是负的一半宽高
            ctx.drawImage(
                img, 
                -img.naturalWidth / 2, 
                -img.naturalHeight / 2, 
                img.naturalWidth, 
                img.naturalHeight
            );
            
            // 更新图片显示
            canvas.toBlob((blob) => {
                compressedImage.src = URL.createObjectURL(blob);
                currentFile = new File([blob], currentFile.name, { type: currentFile.type });
                compressedSize.textContent = formatFileSize(blob.size);
            }, currentFile.type);
        };
        
        img.src = compressedImage.src;
    }

    // 修改滤镜事件监听
    const filterSelect = document.getElementById('filterSelect');
    filterSelect.addEventListener('change', () => {
        if (!currentFile) {
            alert('请先上传图片！');
            filterSelect.value = 'none';
            return;
        }
        
        currentFilter = filterSelect.value;
        
        if (currentFilter === 'none') {
            // 恢复到原始图片状态
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                
                // 如果有旋转，保持旋转状态
                if (currentRotation !== 0) {
                    if (currentRotation % 180 !== 0) {
                        canvas.width = img.naturalHeight;
                        canvas.height = img.naturalWidth;
                    }
                    ctx.translate(canvas.width / 2, canvas.height / 2);
                    ctx.rotate((currentRotation * Math.PI) / 180);
                    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
                } else {
                    ctx.drawImage(img, 0, 0);
                }
                
                canvas.toBlob((blob) => {
                    compressedImage.src = URL.createObjectURL(blob);
                    currentFile = new File([blob], originalFile.name, { type: originalFile.type });
                    compressedSize.textContent = formatFileSize(blob.size);
                }, originalFile.type, quality.value / 100);
            };
            img.src = originalImageUrl;
        } else {
            applyFilter();
        }
    });

    // 修改滤镜处理函数
    function applyFilter() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            
            // 根据当前选择的滤镜应用效果
            switch (currentFilter) {
                case 'grayscale':
                    ctx.filter = 'grayscale(100%)';
                    break;
                case 'sepia':
                    ctx.filter = 'sepia(100%)';
                    break;
                case 'blur':
                    ctx.filter = 'blur(5px)';
                    break;
                case 'brightness':
                    ctx.filter = 'brightness(150%)';
                    break;
                case 'contrast':
                    ctx.filter = 'contrast(200%)';
                    break;
                case 'hue-rotate':
                    ctx.filter = 'hue-rotate(90deg)';
                    break;
                case 'invert':
                    ctx.filter = 'invert(100%)';
                    break;
            }
            
            // 如果有旋转，需要考虑旋转角度
            if (currentRotation !== 0) {
                if (currentRotation % 180 !== 0) {
                    canvas.width = img.naturalHeight;
                    canvas.height = img.naturalWidth;
                }
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate((currentRotation * Math.PI) / 180);
                ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
            } else {
                ctx.drawImage(img, 0, 0);
            }
            
            canvas.toBlob((blob) => {
                compressedImage.src = URL.createObjectURL(blob);
                currentFile = new File([blob], currentFile.name, { type: currentFile.type });
                compressedSize.textContent = formatFileSize(blob.size);
            }, currentFile.type);
        };
        
        img.src = originalImageUrl;  // 始终使用原始图片应用滤镜
    }
});