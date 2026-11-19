package com.jing.monitor;

import com.jing.monitor.model.CourseSection;
import com.jing.monitor.model.User;
import com.jing.monitor.model.UserSectionSubscription;
import com.jing.monitor.model.dto.AdminSectionSubRespDto;
import com.jing.monitor.model.dto.AdminUserSubsRespDto;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The admin user list returns every user in one response, ordered by email, with all of their
 * subscriptions (disabled ones included) and their registration time; the dashboard sorts it.
 */
class AdminUserListTest extends IntegrationTestBase {

    @Test
    void listsEveryUserWithAllOfTheirSubscriptions() {
        // admin@example.com (from the base) has no subscriptions.
        User carol = user("carol@example.com", LocalDateTime.of(2026, 1, 3, 12, 0));
        User bob = user("bob@example.com", LocalDateTime.of(2026, 1, 1, 12, 0));
        CourseSection first = section("1272", "000001");
        CourseSection second = section("1272", "000002");
        subscribe(bob, first, true);
        subscribe(bob, second, false);
        subscribe(carol, second, true);

        List<AdminUserSubsRespDto> rows = admin.getUserSubscriptions();

        assertThat(rows).extracting(AdminUserSubsRespDto::getEmail)
                .containsExactly("admin@example.com", "bob@example.com", "carol@example.com");
        assertThat(rows.get(0).getSubscriptions()).isEmpty();
        assertThat(rows.get(1).getSubscriptions())
                .extracting(AdminSectionSubRespDto::isEnabled)
                .containsExactlyInAnyOrder(true, false);
        assertThat(rows.get(1).getRegisteredAt()).isEqualTo(LocalDateTime.of(2026, 1, 1, 12, 0));
        assertThat(rows.get(2).getSubscriptions()).singleElement()
                .extracting(AdminSectionSubRespDto::getDocId)
                .isEqualTo(second.getDocId());
    }

    private User user(String email, LocalDateTime createdAt) {
        User created = new User(email, "unused-password-hash");
        created.setCreatedAt(createdAt);
        return users.save(created);
    }

    private void subscribe(User owner, CourseSection section, boolean enabled) {
        UserSectionSubscription subscription = new UserSectionSubscription();
        subscription.setUser(owner);
        subscription.setSection(section);
        subscription.setEnabled(enabled);
        subscriptions.save(subscription);
    }
}
