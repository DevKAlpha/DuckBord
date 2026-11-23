; DuckBord installs by default in C:\Program Files (x86)\DuckBord (story 27).
; The installer reads the folder of a previous installation from the registry
; (InstallLocation): it is written only when there is none, so an update keeps
; the folder the person chose. The folder can still be changed in the wizard.
!macro preInit
  SetRegView 64
  ReadRegStr $0 HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation
  StrCmp $0 "" 0 duckbord_has_location
    WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "$PROGRAMFILES32\DuckBord"
    SetRegView 32
    WriteRegExpandStr HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation "$PROGRAMFILES32\DuckBord"
  duckbord_has_location:
  SetRegView 64
!macroend
