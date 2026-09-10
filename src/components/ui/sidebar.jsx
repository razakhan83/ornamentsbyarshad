// @ts-nocheck
"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function composeEventHandlers(theirHandler, ourHandler) {
  return (event) => {
    theirHandler?.(event)

    if (!event.defaultPrevented) {
      ourHandler?.(event)
    }
  }
}

function renderWithProps(render, props, children) {
  if (!React.isValidElement(render)) return null

  return React.cloneElement(render, {
    ...props,
    ...render.props,
    className: cn(props.className, render.props.className),
    onClick: composeEventHandlers(render.props.onClick, props.onClick),
  }, children)
}

function Sidebar({
  className,
  ...props
}) {
  return (
    <div
      data-slot="sidebar"
      data-sidebar="sidebar"
      className={cn(
        "flex h-full flex-col bg-sidebar text-sidebar-foreground",
        className
      )}
      {...props}
    />
  )
}

function SidebarHeader({
  className,
  ...props
}) {
  return (
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  )
}

function SidebarFooter({
  className,
  ...props
}) {
  return (
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      className={cn("flex flex-col gap-2 p-2", className)}
      {...props}
    />
  )
}

function SidebarSeparator({
  className,
  ...props
}) {
  return (
    <div
      data-slot="sidebar-separator"
      data-sidebar="separator"
      className={cn("mx-2 h-px bg-sidebar-border", className)}
      {...props}
    />
  )
}

function SidebarContent({
  className,
  ...props
}) {
  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", className)}
      {...props}
    />
  )
}

function SidebarGroup({
  className,
  ...props
}) {
  return (
    <section
      data-slot="sidebar-group"
      data-sidebar="group"
      className={cn("flex w-full min-w-0 flex-col gap-2 p-2", className)}
      {...props}
    />
  )
}

function SidebarGroupLabel({
  className,
  ...props
}) {
  return (
    <div
      data-slot="sidebar-group-label"
      data-sidebar="group-label"
      className={cn(
        "px-2 text-xs font-medium uppercase tracking-[0.18em] text-sidebar-foreground/60",
        className
      )}
      {...props}
    />
  )
}

function SidebarGroupContent({
  className,
  ...props
}) {
  return (
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      className={cn("w-full text-sm", className)}
      {...props}
    />
  )
}

function SidebarMenu({
  className,
  ...props
}) {
  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      className={cn("flex w-full min-w-0 flex-col gap-1", className)}
      {...props}
    />
  )
}

function SidebarMenuItem({
  className,
  ...props
}) {
  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      className={cn("group/menu-item relative", className)}
      {...props}
    />
  )
}

function SidebarMenuButton({
  className,
  isActive = false,
  render,
  children,
  ...props
}) {
  const buttonClassName = cn(
    "flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 transition-[background-color,color,transform,border-color] duration-200 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.96] [&>span:last-child]:truncate [&_svg]:size-4 [&_svg]:shrink-0",
    isActive
      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_16px_28px_-24px_color-mix(in_oklab,var(--color-sidebar-primary)_42%,transparent)]"
      : "bg-sidebar-accent/70 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
    className
  )

  if (render) {
    return renderWithProps(render, {
      ...props,
      "data-slot": "sidebar-menu-button",
      "data-sidebar": "menu-button",
      "data-active": isActive ? "true" : undefined,
      className: buttonClassName,
    }, children)
  }

  return (
    <button
      data-slot="sidebar-menu-button"
      data-sidebar="menu-button"
      data-active={isActive ? "true" : undefined}
      className={buttonClassName}
      {...props}
    >
      {children}
    </button>
  )
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
}
