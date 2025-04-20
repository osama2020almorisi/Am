// ======================
// #GLOBAL HELPERS - دوال مساعدة
// ======================
const DOM = {
    get: selector => document.querySelector(selector),
    getAll: selector => document.querySelectorAll(selector)
};

// ======================
// #MOBILE MENU - قائمة الجوال
// ======================
const mobileMenu = (() => {
    const menu = DOM.get('.nav__links');
    const hamburger = DOM.get('.hamburger-menu');
    let isOpen = false;

    const toggleMenu = () => {
        isOpen = !isOpen;
        menu.classList.toggle('active');
        document.body.style.overflow = isOpen ? 'hidden' : '';
    };

    const closeOnOutsideClick = (e) => {
        if (isOpen && !hamburger.contains(e.target) && !menu.contains(e.target)) {
            toggleMenu();
        }
    };

    const init = () => {
        hamburger.addEventListener('click', toggleMenu);
        document.addEventListener('click', closeOnOutsideClick);
        document.addEventListener('keyup', (e) => {
            if (e.key === 'Escape' && isOpen) toggleMenu();
        });
    };

    return { init };
})();

// ======================
// #SMOOTH SCROLL - التمرير السلس
// ======================
const smoothScroll = () => {
    const internalLinks = DOM.getAll('a[href^="#"]:not([href="#"])');
    
    internalLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = DOM.get(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                
                // تحديث العنوان بدون #
                history.pushState(null, null, targetId);
            }
        });
    });
};

// ======================
// #BOOKING SYSTEM - نظام الحجز
// ======================
const bookingSystem = (() => {
    const state = {
        currentStep: 1,
        selectedService: null,
        selectedDate: null,
        selectedTime: null,
        currentMonth: new Date().getMonth(),
        currentYear: new Date().getFullYear()
    };

    const elements = {
        servicesGrid: DOM.get('.services-grid'),
        calendarGrid: DOM.get('.calendar__grid'),
        currentMonthElement: DOM.get('.current-month'),
        prevMonthBtn: DOM.get('.prev-month'),
        nextMonthBtn: DOM.get('.next-month'),
        timeSlots: DOM.get('.time-slots'),
        bookingSteps: DOM.get('.booking-steps')
    };

    const services = [
        { id: 1, name: 'تنظيف المنازل', price: '150 ر.س', duration: '3 ساعات' },
        { id: 2, name: 'تنظيف المكاتب', price: '250 ر.س', duration: '5 ساعات' }
    ];

    const timeSlots = ['09:00', '11:00', '13:00', '15:00', '17:00'];

    // دالة إنشاء بطاقة الخدمة
    const createServiceCard = (service) => {
        const card = document.createElement('div');
        card.className = 'service-card';
        card.innerHTML = `
            <h4 class="service-card__title">${service.name}</h4>
            <div class="service-card__details">
                <p class="price">${service.price}</p>
                <p class="duration">${service.duration}</p>
            </div>
            <button class="cta-button" aria-label="اختيار ${service.name}">
                اختر الخدمة
            </button>
        `;
        return card;
    };

    // دالة عرض التقويم
    const renderCalendar = (month, year) => {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        
        let html = '<div class="calendar__day header">أحد</div>'.repeat(7);
        
        html += '<div class="calendar__day empty"></div>'.repeat(firstDay);
        
        for (let day = 1; day <= daysInMonth; day++) {
            html += `
                <div class="calendar__day" 
                     data-date="${year}-${month + 1}-${day}"
                     aria-label="${day} ${new Date(year, month).toLocaleString('ar', { month: 'long' })}">
                    ${day}
                </div>
            `;
        }
        
        elements.calendarGrid.innerHTML = html;
        elements.currentMonthElement.textContent = 
            new Date(year, month).toLocaleDateString('ar', { month: 'long', year: 'numeric' });
    };

    // إدارة حالة الخطوات
    const handleSteps = (direction) => {
        const currentStepElement = DOM.get(`[data-step="${state.currentStep}"]`);
        currentStepElement.classList.remove('active');
        
        state.currentStep = direction === 'next' ? state.currentStep + 1 : state.currentStep - 1;
        
        const nextStepElement = DOM.get(`[data-step="${state.currentStep}"]`);
        nextStepElement.classList.add('active');
    };

    // معالجة اختيار التاريخ
    const handleDateSelection = (dateElement) => {
        DOM.getAll('.calendar__day').forEach(day => 
            day.classList.remove('selected'));
        
        dateElement.classList.add('selected');
        state.selectedDate = dateElement.dataset.date;
        
        // عرض الأوقات المتاحة
        elements.timeSlots.innerHTML = timeSlots.map(time => `
            <div class="time-slot" data-time="${time}">
                ${time}
            </div>
        `).join('');
    };

    // تهيئة النظام
    const init = () => {
        // تحميل الخدمات
        elements.servicesGrid.innerHTML = '';
        services.forEach(service => {
            elements.servicesGrid.appendChild(createServiceCard(service));
        });

        // تهيئة التقويم
        renderCalendar(state.currentMonth, state.currentYear);

        // إضافة مستمعي الأحداث
        elements.servicesGrid.addEventListener('click', (e) => {
            if (e.target.closest('.service-card')) {
                state.selectedService = e.target.closest('.service-card').dataset.id;
                handleSteps('next');
            }
        });

        elements.calendarGrid.addEventListener('click', (e) => {
            if (e.target.classList.contains('calendar__day') && 
                !e.target.classList.contains('empty')) {
                handleDateSelection(e.target);
            }
        });

        elements.timeSlots.addEventListener('click', (e) => {
            if (e.target.classList.contains('time-slot')) {
                DOM.getAll('.time-slot').forEach(slot => 
                    slot.classList.remove('selected'));
                e.target.classList.add('selected');
                state.selectedTime = e.target.dataset.time;
                handleSteps('next');
            }
        });

        elements.prevMonthBtn.addEventListener('click', () => {
            state.currentMonth--;
            if (state.currentMonth < 0) {
                state.currentMonth = 11;
                state.currentYear--;
            }
            renderCalendar(state.currentMonth, state.currentYear);
        });

        elements.nextMonthBtn.addEventListener('click', () => {
            state.currentMonth++;
            if (state.currentMonth > 11) {
                state.currentMonth = 0;
                state.currentYear++;
            }
            renderCalendar(state.currentMonth, state.currentYear);
        });
    };

    return { init };
})();

// ======================
// #INITIALIZATION - تهيئة النظام
// ======================
document.addEventListener('DOMContentLoaded', () => {
    mobileMenu.init();
    smoothScroll();
    bookingSystem.init();
});



// فلترة الخدمات
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelector('.filter-btn.active').classList.remove('active');
        this.classList.add('active');
        
        const filter = this.dataset.filter;
        filterServices(filter);
    });
});

function filterServices(filter) {
    document.querySelectorAll('.service-card').forEach(card => {
        const shouldShow = filter === 'all' || card.dataset.category === filter;
        card.style.display = shouldShow ? 'block' : 'none';
    });
}

// العد التنازلي للعرض
function updateCountdown() {
    const targetDate = new Date().setDate(new Date().getDate() + 3);
    const now = new Date().getTime();
    const distance = targetDate - now;

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    document.getElementById('countdown').innerHTML = 
        `${days} أيام ${hours} : ${minutes} : ${seconds}`;

    if (distance < 0) {
        clearInterval(countdownInterval);
        document.querySelector('.special-offers').style.display = 'none';
    }
}

let countdownInterval = setInterval(updateCountdown, 1000);

// تحسين فلترة الخدمات
const filterButtons = document.querySelectorAll('.filter-btn');
const serviceCards = document.querySelectorAll('.service-card');

filterButtons.forEach(btn => {
    btn.addEventListener('click', function() {
        const filter = this.dataset.filter;
        
        serviceCards.forEach(card => {
            const match = filter === 'all' || 
                         card.dataset.category === filter ||
                         (filter === 'discount' && card.querySelector('.discount-badge'));
            
            card.style.display = match ? 'grid' : 'none';
            card.setAttribute('aria-hidden', !match);
        });
    });
});

// services.js
class ServiceFilter {
    constructor() {
        this.filters = document.querySelectorAll('.filter-btn');
        this.services = document.querySelectorAll('.service-card');
        this.init();
    }

    init() {
        this.filters.forEach(filter => {
            filter.addEventListener('click', (e) => this.handleFilter(e));
        });
    }

    handleFilter(e) {
        const filter = e.currentTarget.dataset.filter;
        
        this.filters.forEach(f => {
            f.classList.toggle('active', f === e.currentTarget);
            f.setAttribute('aria-checked', f === e.currentTarget);
        });

        this.services.forEach(service => {
            const category = service.dataset.category;
            const isVisible = filter === 'all' || 
                            category === filter || 
                            (filter === 'discount' && service.querySelector('.discount-badge'));
            
            service.classList.toggle('hidden', !isVisible);
            service.setAttribute('aria-hidden', !isVisible);
        });
    }
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    new ServiceFilter();
    new CountdownTimer('.countdown', '2023-12-31');
});
