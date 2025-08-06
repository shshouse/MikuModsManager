export class SettingsManager {
  loadSettingsPage(): void {
    const savedUserName = localStorage.getItem('user-name');
    const savedUserAvatar = localStorage.getItem('user-avatar');
    
    if (savedUserName) {
      const userNameInput = document.getElementById('user-name') as HTMLInputElement;
      if (userNameInput) {
        userNameInput.value = savedUserName;
        const displayName = document.querySelector('.user-name');
        if (displayName) {
          displayName.textContent = savedUserName;
        }
      }
    }
    
    if (savedUserAvatar) {
      const avatarImg = document.querySelector('.user-avatar img') as HTMLImageElement | null;
      if (avatarImg) {
        avatarImg.src = savedUserAvatar;
      }
    }
    
    console.log('Loading settings page...');
  }

  updateUserName(): void {
    const userNameInput = document.getElementById('user-name') as HTMLInputElement;
    if (userNameInput) {
      const newName = userNameInput.value.trim();
      if (newName) {
        localStorage.setItem('user-name', newName);
        
        const displayName = document.querySelector('.user-name');
        if (displayName) {
          displayName.textContent = newName;
        }
        
        console.log('User name updated:', newName);
      }
    }
  }

  updateUserAvatar(): void {
    const avatarInput = document.getElementById('user-avatar') as HTMLInputElement;
    if (avatarInput && avatarInput.files && avatarInput.files[0]) {
      const file = avatarInput.files[0];
      const reader = new FileReader();
      
      reader.onload = function(e) {
        const avatarData = e.target?.result as string;
        if (avatarData) {
          localStorage.setItem('user-avatar', avatarData);
          
          const avatarImg = document.querySelector('.user-avatar img') as HTMLImageElement | null;
          if (avatarImg) {
            avatarImg.src = avatarData;
          }
          
          console.log('User avatar updated');
        }
      };
      
      reader.readAsDataURL(file);
    }
  }

  loadAboutPage(): void {
    console.log('Loading about page...');
  }
}