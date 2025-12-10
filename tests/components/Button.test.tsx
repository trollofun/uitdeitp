import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/components/button';

describe('Button Component', () => {
  describe('Rendering', () => {
    it('should render button with text', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
    });

    it('should render button with children', () => {
      render(
        <Button>
          <span>Icon</span>
          <span>Text</span>
        </Button>
      );

      expect(screen.getByText('Icon')).toBeInTheDocument();
      expect(screen.getByText('Text')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<Button className="custom-class">Button</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('custom-class');
    });

    it('should render as child component when asChild is true', () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      );

      const link = screen.getByRole('link');
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/test');
    });
  });

  describe('Variants', () => {
    it('should render default variant', () => {
      render(<Button variant="default">Default</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-primary');
    });

    it('should render destructive variant', () => {
      render(<Button variant="destructive">Delete</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-destructive');
    });

    it('should render outline variant', () => {
      render(<Button variant="outline">Outline</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('border');
    });

    it('should render secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-secondary');
    });

    it('should render ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('hover:bg-accent');
    });

    it('should render link variant', () => {
      render(<Button variant="link">Link</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('underline-offset-4');
    });
  });

  describe('Sizes', () => {
    it('should render default size', () => {
      render(<Button size="default">Default Size</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('h-10');
    });

    it('should render small size', () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('h-9');
    });

    it('should render large size', () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('h-11');
    });

    it('should render icon size', () => {
      render(<Button size="icon">X</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('h-10');
      expect(button.className).toContain('w-10');
    });
  });

  describe('States', () => {
    it('should be enabled by default', () => {
      render(<Button>Enabled</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeEnabled();
    });

    it('should render disabled state', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button.className).toContain('disabled:opacity-50');
    });

    it('should not trigger click when disabled', async () => {
      const handleClick = vi.fn();
      render(<Button disabled onClick={handleClick}>Disabled</Button>);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Interactions', () => {
    it('should handle click events', async () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);

      const button = screen.getByRole('button');
      await userEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple clicks', async () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);

      const button = screen.getByRole('button');
      await userEvent.click(button);
      await userEvent.click(button);
      await userEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(3);
    });

    it('should handle keyboard navigation', async () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Button</Button>);

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();

      await userEvent.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalled();
    });

    it('should handle space key', async () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Button</Button>);

      const button = screen.getByRole('button');
      button.focus();

      await userEvent.keyboard(' ');
      expect(handleClick).toHaveBeenCalled();
    });
  });

  describe('HTML Attributes', () => {
    it('should accept type attribute', () => {
      render(<Button type="submit">Submit</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('should accept aria-label', () => {
      render(<Button aria-label="Close">X</Button>);
      const button = screen.getByRole('button', { name: 'Close' });
      expect(button).toBeInTheDocument();
    });

    it('should accept data attributes', () => {
      render(<Button data-testid="custom-button">Button</Button>);
      const button = screen.getByTestId('custom-button');
      expect(button).toBeInTheDocument();
    });

    it('should forward ref', () => {
      const ref = vi.fn();
      render(<Button ref={ref}>Button</Button>);
      expect(ref).toHaveBeenCalled();
    });
  });

  describe('Combination Tests', () => {
    it('should combine variant and size', () => {
      render(
        <Button variant="destructive" size="lg">
          Large Destructive
        </Button>
      );

      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-destructive');
      expect(button.className).toContain('h-11');
    });

    it('should combine variant, size, and custom class', () => {
      render(
        <Button variant="outline" size="sm" className="custom">
          Small Outline
        </Button>
      );

      const button = screen.getByRole('button');
      expect(button.className).toContain('border');
      expect(button.className).toContain('h-9');
      expect(button.className).toContain('custom');
    });

    it('should work with all props combined', async () => {
      const handleClick = vi.fn();
      render(
        <Button
          variant="secondary"
          size="lg"
          className="custom"
          type="submit"
          onClick={handleClick}
          aria-label="Submit form"
        >
          Submit
        </Button>
      );

      const button = screen.getByRole('button', { name: 'Submit form' });
      expect(button).toHaveAttribute('type', 'submit');
      expect(button.className).toContain('bg-secondary');
      expect(button.className).toContain('h-11');

      await userEvent.click(button);
      expect(handleClick).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty children', () => {
      render(<Button></Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should handle null children', () => {
      render(<Button>{null}</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should handle undefined variant', () => {
      render(<Button variant={undefined}>Button</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-primary'); // default variant
    });

    it('should handle long text content', () => {
      const longText = 'This is a very long button text that might wrap to multiple lines';
      render(<Button>{longText}</Button>);
      expect(screen.getByRole('button', { name: longText })).toBeInTheDocument();
    });

    it('should handle special characters in text', () => {
      render(<Button>{"<>&'\" Special"}</Button>);
      expect(screen.getByRole('button')).toHaveTextContent("<>&'\" Special");
    });

    it('should maintain focus ring on focus', () => {
      render(<Button>Button</Button>);
      const button = screen.getByRole('button');
      button.focus();

      expect(button.className).toContain('focus-visible:ring-2');
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard accessible', async () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Button</Button>);

      const button = screen.getByRole('button');
      await userEvent.tab();
      expect(button).toHaveFocus();
    });

    it('should have correct role', () => {
      render(<Button>Button</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should support aria-disabled', () => {
      render(<Button disabled>Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should have visible focus indicator', () => {
      render(<Button>Button</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('focus-visible:outline-none');
      expect(button.className).toContain('focus-visible:ring-2');
    });
  });
});
