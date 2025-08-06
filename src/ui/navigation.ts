export class Navigation {
  private currentPage: string = 'mod-manager';

  constructor() {}

  initialize(): void {
    this.initializeNavigation();
  }

  private initializeNavigation(): void {
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetPage = link.getAttribute('data-page');
        if (targetPage) {
          this.switchPage(targetPage);
        }
      });
    });

    this.switchPage('mod-manager');
  }

  switchPage(pageId: string): void {
    // Update navigation active state
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.classList.remove('active');
      const link = item.querySelector('.nav-link');
      if (link && link.getAttribute('data-page') === pageId) {
        item.classList.add('active');
      }
    });

    // Update page visibility
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
      page.classList.remove('active');
    });

    const targetPage = document.getElementById(`${pageId}-page`);
    if (targetPage) {
      targetPage.classList.add('active');
      this.currentPage = pageId;
    }

    // Trigger page load event
    this.onPageChange(pageId);
  }

  getCurrentPage(): string {
    return this.currentPage;
  }

  private onPageChange(pageId: string): void {
    const event = new CustomEvent('pageChange', { detail: { pageId } });
    document.dispatchEvent(event);
  }
}