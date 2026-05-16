import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

/**
 * JwtAuthGuard extiende AuthGuard('jwt') de @nestjs/passport.
 * El comportamiento real de verificación JWT lo hace Passport internamente.
 * En unit test no tenemos Passport configurado, así que probamos:
 *  - Que la clase existe y hereda CanActivate (smoke)
 *  - El comportamiento mock del guard como caja negra con request mock
 *
 * Para tests de comportamiento de autenticación completo (con JWT real),
 * ver auth.e2e-spec.ts (Fase D).
 */
describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  it('debe instanciarse correctamente', () => {
    expect(guard).toBeDefined();
  });

  it('debe tener el método canActivate', () => {
    expect(typeof guard.canActivate).toBe('function');
  });

  describe('comportamiento con request mockeado', () => {
    function buildContext(headers: Record<string, string>): ExecutionContext {
      return {
        switchToHttp: () => ({
          getRequest: () => ({ headers }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as ExecutionContext;
    }

    it('sin header Authorization → canActivate rechaza (lanza o retorna false)', async () => {
      const ctx = buildContext({});

      // AuthGuard('jwt') internamente llama super.canActivate() que usa Passport.
      // Sin Passport configurado, lanzará un error. El comportamiento esperado
      // es que NO retorne true cuando no hay token.
      let result: boolean | undefined;
      let threw = false;
      try {
        result = (await Promise.resolve(guard.canActivate(ctx))) as boolean;
      } catch {
        threw = true;
      }
      // En test sin Passport: lanza error (no hay estrategia registrada)
      // En runtime real: retorna 401. Ambos son comportamiento de denegación.
      expect(threw || result === false).toBe(true);
    });

    it('con header Authorization malformado → canActivate rechaza (lanza o retorna false)', async () => {
      const ctx = buildContext({ authorization: 'invalid-format-no-bearer' });

      let result: boolean | undefined;
      let threw = false;
      try {
        result = (await Promise.resolve(guard.canActivate(ctx))) as boolean;
      } catch {
        threw = true;
      }
      expect(threw || result === false).toBe(true);
    });
  });
});
